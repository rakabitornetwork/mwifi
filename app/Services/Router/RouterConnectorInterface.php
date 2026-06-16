<?php

namespace App\Services\Router;

interface RouterConnectorInterface
{
    /**
     * Establish connection with Mikrotik Router.
     *
     * @param string $host
     * @param int $port
     * @param string $username
     * @param string $password
     * @return bool
     */
    public function connect(string $host, int $port, string $username, string $password): bool;

    /**
     * Get all PPP Secrets.
     *
     * @return array
     */
    public function getSecrets(): array;

    /**
     * Add a new PPP Secret.
     *
     * @param array $data
     * @return bool
     */
    public function addSecret(array $data): bool;

    /**
     * Update an existing PPP Secret.
     *
     * @param string $username
     * @param array $data
     * @return bool
     */
    public function updateSecret(string $username, array $data): bool;

    /**
     * Delete an existing PPP Secret.
     *
     * @param string $username
     * @return bool
     */
    public function deleteSecret(string $username): bool;

    /**
     * Get all active PPP connections.
     *
     * @return array
     */
    public function getActiveConnections(): array;

    /**
     * Forcefully disconnect an active session (useful for applying changes or isolating immediately).
     *
     * @param string $username
     * @return bool
     */
    public function kickActiveConnection(string $username): bool;
}
