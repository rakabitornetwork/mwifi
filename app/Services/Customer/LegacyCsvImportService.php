<?php

namespace App\Services\Customer;

use App\Models\Customer;
use App\Models\Odp;
use App\Models\Package;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LegacyCsvImportService
{
    public const REQUIRED_HEADERS = ['Login', 'Password', 'FullName', 'Plan'];

    /** @var array<string, int> */
    private array $packageCache = [];

    /** @var array<string, int|null> */
    private array $odpCache = [];

    /** @var array<string, string> */
    private array $passwordHashCache = [];

    /** @var array<string, Customer> */
    private array $existingCustomersByUsername = [];

    /** @var array<string, User> */
    private array $existingUsersByEmail = [];

    /**
     * @return array{
     *     total: int,
     *     created: int,
     *     updated: int,
     *     skipped: int,
     *     packages_created: int,
     *     errors: list<string>
     * }
     */
    public function validateFormat(string $filePath, bool $emailOnly = false): void
    {
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new \InvalidArgumentException("Tidak dapat membaca file: {$filePath}");
        }

        $header = fgetcsv($handle);
        fclose($handle);

        if ($header === false) {
            throw new \InvalidArgumentException('File CSV kosong atau tidak valid.');
        }

        $header = array_map('trim', $header);
        if ($emailOnly) {
            foreach (['Login', 'Email'] as $requiredColumn) {
                $found = false;
                foreach ($header as $column) {
                    if (strcasecmp((string) $column, $requiredColumn) === 0) {
                        $found = true;
                        break;
                    }
                }
                if (! $found) {
                    throw new \InvalidArgumentException(
                        'Format CSV tidak dikenali. Kolom wajib untuk impor email: Login, Email'
                    );
                }
            }

            return;
        }

        $missing = array_diff(self::REQUIRED_HEADERS, $header);
        if ($missing !== []) {
            throw new \InvalidArgumentException(
                'Format CSV tidak dikenali. Kolom wajib: ' . implode(', ', self::REQUIRED_HEADERS)
            );
        }
    }

    public function import(
        string $filePath,
        int $routerId,
        bool $dryRun = false,
        bool $skipExisting = false,
        bool $emailOnly = false,
    ): array {
        $this->validateFormat($filePath, $emailOnly);
        $this->bootLookupCaches();

        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            throw new \InvalidArgumentException("Tidak dapat membaca file: {$filePath}");
        }

        $header = fgetcsv($handle);
        if ($header === false) {
            fclose($handle);
            throw new \InvalidArgumentException('File CSV kosong atau tidak valid.');
        }

        $header = array_map('trim', $header);
        $result = [
            'total' => 0,
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'packages_created' => 0,
            'email_only' => $emailOnly,
            'errors' => [],
        ];

        $import = $emailOnly
            ? function () use ($handle, $header, &$result) {
                $this->importEmailRows($handle, $header, $result);
            }
            : function () use ($handle, $header, $routerId, $skipExisting, &$result) {
                $this->importFullRows($handle, $header, $routerId, $skipExisting, $result);
            };

        if ($dryRun) {
            DB::beginTransaction();
            try {
                $import();
            } finally {
                DB::rollBack();
            }
        } else {
            $import();
        }

        fclose($handle);

        return $result;
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private function importEmailRows($handle, array $header, array &$result): void
    {
        while (($row = fgetcsv($handle)) !== false) {
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $result['total']++;
            $data = $this->rowToAssoc($header, $row);

            try {
                $username = $this->columnValue($data, 'Login');
                if ($username === '') {
                    throw new \RuntimeException('Baris tanpa username (Login).');
                }

                $existing = $this->existingCustomersByUsername[$username] ?? null;
                if (! $existing) {
                    $result['skipped']++;
                    continue;
                }

                $email = strtolower($this->columnValue($data, 'Email'));
                if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $result['skipped']++;
                    continue;
                }

                $user = $existing->user;
                if (! $user) {
                    throw new \RuntimeException('Pelanggan tidak memiliki akun user terkait.');
                }

                $resolvedEmail = $this->uniqueEmail($email, $user->id);
                if (strtolower((string) $user->email) === $resolvedEmail) {
                    $result['skipped']++;
                    continue;
                }

                $user->update(['email' => $resolvedEmail]);
                $this->existingUsersByEmail[strtolower($resolvedEmail)] = $user->fresh();
                $result['updated']++;
            } catch (\Throwable $e) {
                $line = $result['total'] + 1;
                $login = $this->columnValue($data, 'Login') ?: '?';
                $result['errors'][] = "Baris {$line} ({$login}): {$e->getMessage()}";
            }
        }
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private function importFullRows($handle, array $header, int $routerId, bool $skipExisting, array &$result): void
    {
        while (($row = fgetcsv($handle)) !== false) {
            if (count(array_filter($row, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $result['total']++;
            $data = $this->rowToAssoc($header, $row);

            try {
                $username = trim((string) ($data['Login'] ?? ''));
                if ($username === '') {
                    throw new \RuntimeException('Baris tanpa username (Login).');
                }

                $existing = $this->existingCustomersByUsername[$username] ?? null;
                if ($existing && $skipExisting) {
                    $result['skipped']++;
                    continue;
                }

                $package = $this->resolvePackage($data, $result);
                $customerData = $this->mapCustomerData($data, $routerId, $package->id);

                $user = $this->resolveUser($data, $customerData, $existing);
                $customerData['user_id'] = $user->id;

                if ($existing) {
                    $existing->update($customerData);
                    $this->existingCustomersByUsername[$username] = $existing->fresh(['user']);
                    $result['updated']++;
                } else {
                    $customer = Customer::create($customerData);
                    $this->existingCustomersByUsername[$username] = $customer;
                    $result['created']++;
                }
            } catch (\Throwable $e) {
                $line = $result['total'] + 1;
                $result['errors'][] = "Baris {$line} ({$data['Login']}): {$e->getMessage()}";
            }
        }
    }

    /**
     * @param  list<string|null>  $header
     * @param  list<string|null>  $row
     * @return array<string, string>
     */
    private function rowToAssoc(array $header, array $row): array
    {
        $assoc = [];
        foreach ($header as $index => $key) {
            $assoc[$key] = trim((string) ($row[$index] ?? ''));
        }

        return $assoc;
    }

    /**
     * @param  array<string, string>  $data
     */
    private function columnValue(array $data, string ...$keys): string
    {
        foreach ($keys as $key) {
            foreach ($data as $column => $value) {
                if (strcasecmp((string) $column, $key) === 0) {
                    return trim((string) $value);
                }
            }
        }

        return '';
    }

    /**
     * @param  array<string, string>  $data
     * @param  array<string, mixed>  $result
     */
    private function resolvePackage(array $data, array &$result): Package
    {
        $planName = trim((string) ($data['Plan'] ?? ''));
        if ($planName === '') {
            throw new \RuntimeException('Kolom Plan kosong.');
        }

        if (isset($this->packageCache[$planName])) {
            return Package::findOrFail($this->packageCache[$planName]);
        }

        $package = Package::where('name', $planName)
            ->orWhere('mikrotik_profile', $planName)
            ->first();

        if (!$package) {
            $price = $this->parseDecimal($data['Price'] ?? '0');
            $bandwidth = $this->guessBandwidthLimit($planName);

            $package = Package::create([
                'name' => $planName,
                'price' => $price,
                'bandwidth_limit' => $bandwidth,
                'mikrotik_profile' => $planName,
                'type' => 'pppoe',
                'description' => 'Paket diimport otomatis dari CSV aplikasi lama',
            ]);
            $result['packages_created']++;
        }

        $this->packageCache[$planName] = $package->id;

        return $package;
    }

    /**
     * @param  array<string, string>  $data
     * @return array<string, mixed>
     */
    private function mapCustomerData(array $data, int $routerId, int $packageId): array
    {
        $address = trim((string) ($data['Address'] ?? ''));
        if ($address === '') {
            $note = trim((string) ($data['Note'] ?? ''));
            $address = $note !== '' ? $note : $this->guessAreaFromPlan($data['Plan'] ?? '');
        }

        $phone = trim((string) ($data['Phone'] ?? ''));
        if ($phone === '') {
            $phone = '-';
        }

        $latitude = $this->nullableFloat($data['Latitude'] ?? '');
        $longitude = $this->nullableFloat($data['Longitude'] ?? '');

        return [
            'router_id' => $routerId,
            'package_id' => $packageId,
            'odp_id' => $this->resolveOdpId($data['Odp'] ?? ''),
            'service_type' => 'pppoe',
            'username' => trim((string) $data['Login']),
            'password' => trim((string) ($data['Password'] ?? 'gantengmax')) ?: 'gantengmax',
            'name' => trim((string) ($data['FullName'] ?? $data['Login'])),
            'phone_number' => $phone,
            'address' => $address !== '' ? $address : '-',
            'latitude' => $latitude,
            'longitude' => $longitude,
            'status' => $this->resolveStatus($data),
            'billing_date' => $this->resolveBillingDate($data),
            'service_start_date' => $this->resolveServiceStartDate($data),
        ];
    }

    /**
     * @param  array<string, string>  $data
     */
    private function resolveUser(array $data, array $customerData, ?Customer $existing): User
    {
        $email = $this->columnValue($data, 'Email');
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = $customerData['username'] . '@mwifi.test';
        } else {
            $email = strtolower($email);
        }

        if ($existing?->user_id) {
            $user = User::find($existing->user_id);
            if ($user) {
                $user->update([
                    'name' => $customerData['name'],
                    'email' => $this->uniqueEmail($email, $user->id),
                ]);

                return $user;
            }
        }

        $existingByEmail = $this->existingUsersByEmail[strtolower($email)] ?? null;
        if ($existingByEmail) {
            $existingByEmail->update([
                'name' => $customerData['name'],
            ]);

            return $existingByEmail;
        }

        $user = User::create([
            'name' => $customerData['name'],
            'email' => $email,
            'password' => $this->hashedPassword($customerData['password']),
        ]);
        $this->existingUsersByEmail[strtolower($email)] = $user;

        return $user;
    }

    private function bootLookupCaches(): void
    {
        $this->passwordHashCache = [];
        $this->packageCache = [];
        $this->odpCache = [];
        $this->existingCustomersByUsername = Customer::query()
            ->with('user')
            ->get()
            ->keyBy('username')
            ->all();

        $this->existingUsersByEmail = User::query()
            ->get()
            ->keyBy(fn (User $user) => strtolower($user->email))
            ->all();
    }

    private function hashedPassword(string $password): string
    {
        if (!isset($this->passwordHashCache[$password])) {
            $this->passwordHashCache[$password] = Hash::make($password);
        }

        return $this->passwordHashCache[$password];
    }

    private function uniqueEmail(string $email, int $exceptUserId): string
    {
        $conflict = User::where('email', $email)
            ->where('id', '!=', $exceptUserId)
            ->exists();

        if (!$conflict) {
            return $email;
        }

        return "import{$exceptUserId}." . str_replace('@', '.at.', $email);
    }

    private function resolveOdpId(string $odpName): ?int
    {
        $odpName = trim($odpName);
        if ($odpName === '') {
            return null;
        }

        if (array_key_exists($odpName, $this->odpCache)) {
            return $this->odpCache[$odpName];
        }

        $odp = Odp::where('name', $odpName)->first();
        $this->odpCache[$odpName] = $odp?->id;

        return $odp?->id;
    }

    /**
     * @param  array<string, string>  $data
     */
    private function resolveStatus(array $data): string
    {
        $authStatus = trim((string) ($data['AuthStatus'] ?? '1'));
        if ($authStatus === '0') {
            return 'inactive';
        }

        $expiredAt = $this->parseDateTime($data['Expired'] ?? '');
        if ($expiredAt && $expiredAt->lt(now()->startOfDay())) {
            return 'isolated';
        }

        $trxStatus = trim((string) ($data['TrxStatus'] ?? '1'));
        if (in_array($trxStatus, ['2', '3'], true)) {
            return 'isolated';
        }

        return 'active';
    }

    /**
     * @param  array<string, string>  $data
     */
    private function resolveBillingDate(array $data): string
    {
        $invoiceDate = $this->parseDateTime($data['InvoiceDate'] ?? '');
        if ($invoiceDate) {
            return $invoiceDate->toDateString();
        }

        $created = $this->parseDateTime($data['Created'] ?? '');
        if ($created) {
            return $created->toDateString();
        }

        return now()->startOfMonth()->toDateString();
    }

    /**
     * @param  array<string, string>  $data
     */
    private function resolveServiceStartDate(array $data): ?string
    {
        $created = $this->parseDateTime($data['Created'] ?? '');

        return $created?->toDateString();
    }

    private function parseDateTime(string $value): ?Carbon
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseDecimal(string $value): float
    {
        $value = preg_replace('/[^\d.]/', '', $value) ?? '0';

        return (float) ($value !== '' ? $value : 0);
    }

    private function nullableFloat(string $value): ?float
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private function guessBandwidthLimit(string $planName): string
    {
        if (preg_match('/(\d+)\s*(?:Mbps|MBPS|Mbps|M\b)/i', $planName, $matches)) {
            $mbps = (int) $matches[1];

            return "{$mbps}M/{$mbps}M";
        }

        return '10M/10M';
    }

    private function guessAreaFromPlan(string $planName): string
    {
        if (preg_match('/(Cikancas|Sukasari|Leuwihaur|Caruy|Kalibuntu|Karkan|Simpay|Singalodra|Perum|Acoran|Pabrik)/i', $planName, $matches)) {
            return ucfirst(strtolower($matches[1]));
        }

        if (preg_match('/-\s*(.+)$/i', $planName, $matches)) {
            return trim($matches[1]);
        }

        return '-';
    }
}
