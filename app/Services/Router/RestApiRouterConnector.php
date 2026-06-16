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

            return $response->successful();
        } catch (Exception $e) {
            return false;
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
            $response = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->put("{$this->baseUrl}/ppp/secret", $data);

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
            $responseUpdate = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->patch("{$this->baseUrl}/ppp/secret/{$id}", $data);

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
            // Find active session by name to get ID
            $responseFind = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->get("{$this->baseUrl}/ppp/active", ['name' => $username]);

            if (!$responseFind->successful() || empty($responseFind->json())) {
                return true; // Connection already inactive
            }

            $actives = $responseFind->json();
            $id = $actives[0]['.id'] ?? null;

            if (!$id) {
                return false;
            }

            $responseDelete = Http::withBasicAuth($this->username, $this->password)
                ->withoutVerifying()
                ->timeout(5)
                ->delete("{$this->baseUrl}/ppp/active/{$id}");

            return $responseDelete->successful();
        } catch (Exception $e) {
            return false;
        }
    }
}
