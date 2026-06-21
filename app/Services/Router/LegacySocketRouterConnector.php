<?php

namespace App\Services\Router;

use RouterOS\Client;
use RouterOS\Query;
use Exception;

class LegacySocketRouterConnector implements RouterConnectorInterface
{
    /**
     * @var Client|null
     */
    protected ?Client $client = null;

    /**
     * Establish connection with Mikrotik Router.
     */
    public function connect(string $host, int $port, string $username, string $password): bool
    {
        try {
            $this->client = new Client([
                'host' => $host,
                'user' => $username,
                'pass' => $password,
                'port' => $port,
                'timeout' => 5,
            ]);
            return true;
        } catch (Exception $e) {
            throw new Exception("Socket error: " . $e->getMessage());
        }
    }

    /**
     * Get all PPP Secrets.
     */
    public function getSecrets(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ppp/secret/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Add a new PPP Secret.
     */
    public function addSecret(array $data): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $query = new Query('/ppp/secret/add');
            foreach ($data as $key => $value) {
                $query->equal($key, $value);
            }
            $this->client->query($query)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Update an existing PPP Secret.
     */
    public function updateSecret(string $username, array $data): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            // Find the ID of the secret by username first
            $queryFind = (new Query('/ppp/secret/print'))
                ->where('name', $username);
            $secrets = $this->client->query($queryFind)->read();

            if (empty($secrets) || !isset($secrets[0]['.id'])) {
                return false;
            }

            $id = $secrets[0]['.id'];

            // Update the secret using its .id
            $queryUpdate = new Query('/ppp/secret/set');
            $queryUpdate->equal('.id', $id);
            foreach ($data as $key => $value) {
                $queryUpdate->equal($key, $value);
            }
            
            $this->client->query($queryUpdate)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Delete an existing PPP Secret.
     */
    public function deleteSecret(string $username): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            // Find the ID of the secret by username first
            $queryFind = (new Query('/ppp/secret/print'))
                ->where('name', $username);
            $secrets = $this->client->query($queryFind)->read();

            if (empty($secrets) || !isset($secrets[0]['.id'])) {
                return false;
            }

            $id = $secrets[0]['.id'];

            // Delete the secret
            $queryDelete = (new Query('/ppp/secret/remove'))
                ->equal('.id', $id);
            
            $this->client->query($queryDelete)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    /**
     * Get all active PPP connections.
     */
    public function getActiveConnections(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ppp/active/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Forcefully disconnect an active session.
     */
    public function kickActiveConnection(string $username): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $query = new Query('/ppp/active/print');
            $actives = $this->client->query($query)->read();
            $matched = array_values(array_filter(
                $actives,
                fn (array $active) => RouterService::matchesPppUsername($active, $username)
            ));

            if ($matched === []) {
                return true;
            }

            foreach ($matched as $active) {
                if (!isset($active['.id'])) {
                    continue;
                }

                $queryKick = (new Query('/ppp/active/remove'))
                    ->equal('.id', $active['.id']);

                $this->client->query($queryKick)->read();
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
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ppp/profile/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    public function addPppProfile(array $data): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $query = new Query('/ppp/profile/add');
            foreach ($data as $key => $value) {
                $query->equal($key, $value);
            }
            $this->client->query($query)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function updatePppProfile(string $name, array $data): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $queryFind = (new Query('/ppp/profile/print'))
                ->where('name', $name);
            $profiles = $this->client->query($queryFind)->read();

            if (empty($profiles) || !isset($profiles[0]['.id'])) {
                return false;
            }

            $id = $profiles[0]['.id'];

            $queryUpdate = new Query('/ppp/profile/set');
            $queryUpdate->equal('.id', $id);
            foreach ($data as $key => $value) {
                $queryUpdate->equal($key, $value);
            }
            
            $this->client->query($queryUpdate)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function deletePppProfile(string $name): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $queryFind = (new Query('/ppp/profile/print'))
                ->where('name', $name);
            $profiles = $this->client->query($queryFind)->read();

            if (empty($profiles) || !isset($profiles[0]['.id'])) {
                return true;
            }

            $queryDelete = (new Query('/ppp/profile/remove'))
                ->equal('.id', $profiles[0]['.id']);
            $this->client->query($queryDelete)->read();

            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getHotspotProfiles(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ip/hotspot/user-profile/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    public function addHotspotProfile(array $data): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $query = new Query('/ip/hotspot/user-profile/add');
            foreach ($data as $key => $value) {
                $query->equal($key, $value);
            }
            $this->client->query($query)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function updateHotspotProfile(string $name, array $data): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $queryFind = (new Query('/ip/hotspot/user-profile/print'))
                ->where('name', $name);
            $profiles = $this->client->query($queryFind)->read();

            if (empty($profiles) || !isset($profiles[0]['.id'])) {
                return false;
            }

            $id = $profiles[0]['.id'];

            $queryUpdate = new Query('/ip/hotspot/user-profile/set');
            $queryUpdate->equal('.id', $id);
            foreach ($data as $key => $value) {
                $queryUpdate->equal($key, $value);
            }
            
            $this->client->query($queryUpdate)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function deleteHotspotProfile(string $name): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $queryFind = (new Query('/ip/hotspot/user-profile/print'))
                ->where('name', $name);
            $profiles = $this->client->query($queryFind)->read();

            if (empty($profiles) || !isset($profiles[0]['.id'])) {
                return true;
            }

            $queryDelete = (new Query('/ip/hotspot/user-profile/remove'))
                ->equal('.id', $profiles[0]['.id']);
            $this->client->query($queryDelete)->read();

            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getHotspotUsers(): array
    {
        if (!$this->client) {
            throw new Exception("Socket client tidak terhubung.");
        }

        try {
            $query = new Query('/ip/hotspot/user/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            throw new Exception("Gagal mengambil daftar user hotspot: " . $e->getMessage());
        }
    }

    public function addHotspotUser(array $data): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $query = new Query('/ip/hotspot/user/add');
            foreach ($data as $key => $value) {
                $query->equal($key, $value);
            }
            $this->client->query($query)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function deleteHotspotUser(string $username): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $queryFind = (new Query('/ip/hotspot/user/print'))
                ->where('name', $username);
            $users = $this->client->query($queryFind)->read();

            if (empty($users) || !isset($users[0]['.id'])) {
                return false;
            }

            $id = $users[0]['.id'];

            $queryDelete = (new Query('/ip/hotspot/user/remove'))
                ->equal('.id', $id);
            
            $this->client->query($queryDelete)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getHotspotActive(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ip/hotspot/active/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    public function kickHotspotActive(string $username): bool
    {
        if (!$this->client) {
            return false;
        }

        try {
            $queryFind = (new Query('/ip/hotspot/active/print'))
                ->where('user', $username);
            $actives = $this->client->query($queryFind)->read();

            if (empty($actives) || !isset($actives[0]['.id'])) {
                return true;
            }

            $id = $actives[0]['.id'];

            $queryKick = (new Query('/ip/hotspot/active/remove'))
                ->equal('.id', $id);
            
            $this->client->query($queryKick)->read();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getIpPools(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ip/pool/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    public function getSimpleQueues(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/queue/simple/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    public function getQueueTypes(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/queue/type/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    public function getHotspotServers(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ip/hotspot/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
        }
    }

    public function getHotspotServerProfiles(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ip/hotspot/profile/print');
            return $this->client->query($query)->read();
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
        if (!$this->client) {
            return [];
        }

        try {
            $query = (new Query('/interface/print'))
                ->equal('.proplist', 'name,type,running,disabled,rx-bits-per-second,tx-bits-per-second,rx-rate,tx-rate')
                ->equal('stats', '');

            return MikrotikInterfaceService::normalizeList($this->client->query($query)->read());
        } catch (Exception $e) {
            throw new Exception('Gagal membaca daftar interface RouterOS: ' . $e->getMessage());
        }
    }

    public function getInterfaceLiveTraffic(string $interfaceName): array
    {
        if (!$this->client) {
            throw new Exception('Koneksi RouterOS belum tersedia.');
        }

        try {
            $query = (new Query('/interface/monitor-traffic'))
                ->equal('interface', $interfaceName)
                ->equal('once', '');

            $row = $this->client->query($query)->read()[0] ?? [];

            if (!is_array($row) || $row === []) {
                throw new Exception("Interface \"{$interfaceName}\" tidak dapat dimonitor.");
            }

            $rates = MikrotikInterfaceService::parseMonitorTrafficRow($row);

            return [
                'name' => (string) ($row['name'] ?? $interfaceName),
                'rx_bps' => $rates['rx_bps'],
                'tx_bps' => $rates['tx_bps'],
            ];
        } catch (Exception $e) {
            throw new Exception('Gagal membaca trafik interface RouterOS: ' . $e->getMessage());
        }
    }

    public function getSimpleQueueTrafficStats(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = (new Query('/queue/simple/print'))
                ->equal('.proplist', 'name,target,rate,rate-down,rate-up,tx-rate,rx-rate')
                ->equal('stats', '');

            $map = [];
            foreach ($this->client->query($query)->read() as $queue) {
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
        if (!$this->client) {
            return MikrotikResourceService::normalize([]);
        }

        try {
            $resource = $this->client->query(new Query('/system/resource/print'))->read()[0] ?? [];
            $identity = $this->client->query(new Query('/system/identity/print'))->read()[0] ?? [];

            return MikrotikResourceService::normalize(
                is_array($resource) ? $resource : [],
                is_array($identity) ? $identity : []
            );
        } catch (Exception $e) {
            throw new Exception('Gagal membaca resource RouterOS: ' . $e->getMessage());
        }
    }
}
