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
    public function import(string $filePath, int $routerId, bool $dryRun = false, bool $skipExisting = false): array
    {
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
            'errors' => [],
        ];

        $import = function () use ($handle, $header, $routerId, $skipExisting, &$result) {
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

                    $existing = Customer::where('username', $username)->first();
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
                        $result['updated']++;
                    } else {
                        Customer::create($customerData);
                        $result['created']++;
                    }
                } catch (\Throwable $e) {
                    $line = $result['total'] + 1;
                    $result['errors'][] = "Baris {$line} ({$data['Login']}): {$e->getMessage()}";
                }
            }
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
        $email = trim((string) ($data['Email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = $customerData['username'] . '@mwifi.test';
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

        $existingByEmail = User::where('email', $email)->first();
        if ($existingByEmail) {
            $existingByEmail->update([
                'name' => $customerData['name'],
            ]);

            return $existingByEmail;
        }

        return User::create([
            'name' => $customerData['name'],
            'email' => $email,
            'password' => Hash::make($customerData['password']),
        ]);
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
    private function resolveBillingDate(array $data): int
    {
        $invoiceDate = $this->parseDateTime($data['InvoiceDate'] ?? '');
        if ($invoiceDate) {
            return max(1, min(31, (int) $invoiceDate->format('j')));
        }

        $created = $this->parseDateTime($data['Created'] ?? '');
        if ($created) {
            return max(1, min(31, (int) $created->format('j')));
        }

        return 1;
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
