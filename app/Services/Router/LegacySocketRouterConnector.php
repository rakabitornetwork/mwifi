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
            // Find active connection by username
            $queryFind = (new Query('/ppp/active/print'))
                ->where('name', $username);
            $actives = $this->client->query($queryFind)->read();

            if (empty($actives) || !isset($actives[0]['.id'])) {
                return true; // Already not active
            }

            $id = $actives[0]['.id'];

            // Remove active session to force reconnection
            $queryKick = (new Query('/ppp/active/remove'))
                ->equal('.id', $id);
            
            $this->client->query($queryKick)->read();
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

    public function getHotspotUsers(): array
    {
        if (!$this->client) {
            return [];
        }

        try {
            $query = new Query('/ip/hotspot/user/print');
            return $this->client->query($query)->read();
        } catch (Exception $e) {
            return [];
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
}
