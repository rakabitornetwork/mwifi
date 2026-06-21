<?php

namespace App\Services\Router;

use Illuminate\Support\Facades\Http;
use Exception;

class RestApiRouterConnector implements RouterConnectorInterface
{
    protected string $baseUrl = '';
    protected string $username = '';
    protected string $password = '';
    protected bool $verifySsl = false;

    /**
     * Establish connection / setup client credentials.
     */
    public function connect(string $host, int $port, string $username, string $password): bool
    {
        // RouterOS REST API port defaults to 80 (http) or 443 (https) unless custom
        $protocol = ($port === 443) ? 'https' : 'http';
        $this->baseUrl = "{$protocol}://{$host}:{$port}/rest";
        $this->username = $username;
        $this->password = $password;

        // Verify connection by doing a light request to system/identity
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/system/identity");

            if ($response->successful()) {
                return true;
            }
            throw new Exception("HTTP status " . $response->status() . " - " . $response->body());
        } catch (Exception $e) {
            throw new Exception("REST API error: " . $e->getMessage());
        }
    }

    /**
     * Get all PPP Secrets.
     */
    public function getSecrets(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/secret");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Add a new PPP Secret.
     */
    public function addSecret(array $data): bool
    {
        try {
            // RouterOS REST API uses PUT to create new resources
            $filtered = $this->filterData($data);
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->put("{$this->baseUrl}/ppp/secret", $filtered);

            return $response->successful() || $response->status() === 201;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Update an existing PPP Secret.
     */
    public function updateSecret(string $username, array $data): bool
    {
        try {
            // First, find the item by name to get its ID (.id)
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/secret", ['name' => $username]);

            if (!$responseFind->successful() || empty($responseFind->json())) {
                return false;
            }

            $secrets = $responseFind->json();
            $id = $secrets[0]['.id'] ?? null;

            if (!$id) {
                return false;
            }

            // RouterOS REST API uses PATCH to update resources
            $filtered = $this->filterData($data);
            $responseUpdate = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->patch("{$this->baseUrl}/ppp/secret/{$id}", $filtered);

            return $responseUpdate->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Delete an existing PPP Secret.
     */
    public function deleteSecret(string $username): bool
    {
        try {
            // Find by name to get ID
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/secret", ['name' => $username]);

            if (!$responseFind->successful() || empty($responseFind->json())) {
                return false;
            }

            $secrets = $responseFind->json();
            $id = $secrets[0]['.id'] ?? null;

            if (!$id) {
                return false;
            }

            $responseDelete = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->delete("{$this->baseUrl}/ppp/secret/{$id}");

            return $responseDelete->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get all active PPP connections.
     */
    public function getActiveConnections(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/active");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Forcefully disconnect an active session.
     */
    public function kickActiveConnection(string $username): bool
    {
        try {
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/active");

            if (!$responseFind->successful()) {
                return false;
            }

            $matched = array_values(array_filter(
                $responseFind->json() ?? [],
                fn (array $active) => RouterService::matchesPppUsername($active, $username)
            ));

            if ($matched === []) {
                return true;
            }

            foreach ($matched as $active) {
                $id = $active['.id'] ?? null;
                if (!$id) {
                    continue;
                }

                $responseDelete = Http::withBasicAuth($this->username, $this->password)
                    ->withoutVerifying()
                    ->timeout(5)
                    ->delete("{$this->baseUrl}/ppp/active/{$id}");

                if (!$responseDelete->successful()) {
                    return false;
                }
            }

            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get all PPP Profiles from RouterOS.
     */
    public function getProfiles(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/profile");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function addPppProfile(array $data): bool
    {
        try {
            $filtered = $this->filterData($data);
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->put("{$this->baseUrl}/ppp/profile", $filtered);

            return $response->successful() || $response->status() === 201;
        } catch (Exception $e) {
            return false;
        }
    }

    public function updatePppProfile(string $name, array $data): bool
    {
        try {
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/profile", ['name' => $name]);

            if (!$responseFind->successful() || empty($responseFind->json())) {
                return false;
            }

            $profiles = $responseFind->json();
            $id = $profiles[0]['.id'] ?? null;

            if (!$id) {
                return false;
            }

            $filtered = $this->filterData($data);
            $responseUpdate = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->patch("{$this->baseUrl}/ppp/profile/{$id}", $filtered);

            return $responseUpdate->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    public function getHotspotProfiles(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot/user/profile");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function addHotspotProfile(array $data): bool
    {
        try {
            $filtered = $this->filterData($data);
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->put("{$this->baseUrl}/ip/hotspot/user/profile", $filtered);

            return $response->successful() || $response->status() === 201;
        } catch (Exception $e) {
            return false;
        }
    }

    public function updateHotspotProfile(string $name, array $data): bool
    {
        try {
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot/user/profile", ['name' => $name]);

            if (!$responseFind->successful() || empty($responseFind->json())) {
                return false;
            }

            $profiles = $responseFind->json();
            $id = $profiles[0]['.id'] ?? null;

            if (!$id) {
                return false;
            }

            $filtered = $this->filterData($data);
            $responseUpdate = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->patch("{$this->baseUrl}/ip/hotspot/user/profile/{$id}", $filtered);

            return $responseUpdate->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    public function getHotspotUsers(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot/user");

            if (!$response->successful()) {
                throw new Exception("REST API HTTP Error " . $response->status() . ": " . $response->body());
            }

            return $response->json();
        } catch (Exception $e) {
            throw new Exception("Gagal mengambil daftar user hotspot: " . $e->getMessage());
        }
    }

    public function addHotspotUser(array $data): bool
    {
        try {
            $filtered = $this->filterData($data);
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->put("{$this->baseUrl}/ip/hotspot/user", $filtered);

            return $response->successful() || $response->status() === 201;
        } catch (Exception $e) {
            return false;
        }
    }

    public function deleteHotspotUser(string $username): bool
    {
        try {
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot/user", ['name' => $username]);

            if (!$responseFind->successful() || empty($responseFind->json())) {
                return false;
            }

            $users = $responseFind->json();
            $id = $users[0]['.id'] ?? null;

            if (!$id) {
                return false;
            }

            $responseDelete = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->delete("{$this->baseUrl}/ip/hotspot/user/{$id}");

            return $responseDelete->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    public function getHotspotActive(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot/active");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function kickHotspotActive(string $username): bool
    {
        try {
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot/active", ['user' => $username]);

            if (!$responseFind->successful() || empty($responseFind->json())) {
                return true;
            }

            $actives = $responseFind->json();
            $id = $actives[0]['.id'] ?? null;

            if (!$id) {
                return false;
            }

            $responseDelete = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->delete("{$this->baseUrl}/ip/hotspot/active/{$id}");

            return $responseDelete->successful();
        } catch (Exception $e) {
            return false;
        }
    }

    public function getIpPools(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/pool");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function getSimpleQueues(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/queue/simple");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function getQueueTypes(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/queue/type");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function getHotspotServers(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function getHotspotServerProfiles(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ip/hotspot/profile");

            return $response->successful() ? $response->json() : [];
        } catch (Exception $e) {
            return [];
        }
    }

    public function getInterfaceTrafficStats(): array
    {
        $map = [];

        foreach ($this->getInterfaces() as $iface) {
            $stats = [
                'rx_bps' => (int) ($iface['rx_bps'] ?? 0),
                'tx_bps' => (int) ($iface['tx_bps'] ?? 0),
            ];

            $map[$iface['name']] = $stats;
            $map[strtolower((string) $iface['name'])] = $stats;
        }

        return $map;
    }

    public function getInterfaces(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(8)
                ->get("{$this->baseUrl}/interface");

            if (!$response->successful()) {
                throw new Exception('HTTP status ' . $response->status());
            }

            $payload = $response->json();

            return MikrotikInterfaceService::normalizeList(is_array($payload) ? $payload : []);
        } catch (Exception $e) {
            throw new Exception('Gagal membaca daftar interface RouterOS: ' . $e->getMessage());
        }
    }

    public function getSimpleQueueTrafficStats(): array
    {
        try {
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(8)
                ->get("{$this->baseUrl}/queue/simple");

            if (!$response->successful()) {
                return [];
            }

            $map = [];
            foreach ($response->json() as $queue) {
                if (!is_array($queue)) {
                    continue;
                }

                $rates = $this->parseQueueRates($queue);
                if ($rates === null) {
                    continue;
                }

                foreach (array_filter([$queue['target'] ?? '', $queue['name'] ?? '']) as $key) {
                    $map[$key] = $rates;
                    $map[strtolower($key)] = $rates;
                }
            }

            return $map;
        } catch (Exception $e) {
            return [];
        }
    }

    private function parseQueueRates(array $queue): ?array
    {
        $download = MikrotikTrafficService::normalizeRate($queue['rate-down'] ?? $queue['rx-rate'] ?? null);
        $upload = MikrotikTrafficService::normalizeRate($queue['rate-up'] ?? $queue['tx-rate'] ?? null);

        if ($download !== null || $upload !== null) {
            return [
                'download_bps' => $download ?? 0,
                'upload_bps' => $upload ?? 0,
            ];
        }

        $rate = (string) ($queue['rate'] ?? '');
        if (!str_contains($rate, '/')) {
            return null;
        }

        [$first, $second] = array_pad(explode('/', $rate, 2), 2, '0');

        return [
            'download_bps' => MikrotikTrafficService::normalizeRate($second) ?? 0,
            'upload_bps' => MikrotikTrafficService::normalizeRate($first) ?? 0,
        ];
    }

    public function getSystemResources(): array
    {
        try {
            $resourceResponse = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(8)
                ->get("{$this->baseUrl}/system/resource");

            if (!$resourceResponse->successful()) {
                throw new Exception('HTTP status ' . $resourceResponse->status());
            }

            $resourcePayload = $resourceResponse->json();
            $resource = is_array($resourcePayload) ? ($resourcePayload[0] ?? $resourcePayload) : [];

            $identityResponse = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(8)
                ->get("{$this->baseUrl}/system/identity");

            $identityPayload = $identityResponse->successful() ? $identityResponse->json() : [];
            $identity = is_array($identityPayload) ? ($identityPayload[0] ?? $identityPayload) : [];

            return MikrotikResourceService::normalize(
                is_array($resource) ? $resource : [],
                is_array($identity) ? $identity : []
            );
        } catch (Exception $e) {
            throw new Exception('Gagal membaca resource RouterOS: ' . $e->getMessage());
        }
    }

    /**
     * Filter out null and empty string values to prevent RouterOS REST API Bad Request errors.
     */
    private function filterData(array $data): array
    {
        return array_filter($data, function ($val) {
            return $val !== null && $val !== '';
        });
    }
}
