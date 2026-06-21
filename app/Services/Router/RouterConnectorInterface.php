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
     * Get all PPP Profiles from RouterOS.
     *
     * @return array
     */
    public function getProfiles(): array;

    public function addPppProfile(array $data): bool;

    public function updatePppProfile(string $name, array $data): bool;

    /**
     * Forcefully disconnect an active session (useful for applying changes or isolating immediately).
     *
     * @param string $username
     * @return bool
     */
    public function kickActiveConnection(string $username): bool;

    /**
     * Get all Hotspot User Profiles.
     *
     * @return array
     */
    public function getHotspotProfiles(): array;

    public function addHotspotProfile(array $data): bool;

    public function updateHotspotProfile(string $name, array $data): bool;

    /**
     * Get all Hotspot Users.
     *
     * @return array
     */
    public function getHotspotUsers(): array;

    /**
     * Add a new Hotspot User (Voucher).
     *
     * @param array $data
     * @return bool
     */
    public function addHotspotUser(array $data): bool;

    /**
     * Delete a Hotspot User.
     *
     * @param string $username
     * @return bool
     */
    public function deleteHotspotUser(string $username): bool;

    /**
     * Get all active Hotspot sessions.
     *
     * @return array
     */
    public function getHotspotActive(): array;

    /**
     * Forcefully kick an active Hotspot user.
     *
     * @param string $username
     * @return bool
     */
    public function kickHotspotActive(string $username): bool;

    /**
     * Get all IP Pools.
     *
     * @return array
     */
    public function getIpPools(): array;

    /**
     * Get all Simple Queues (useful for parent queues).
     *
     * @return array
     */
    public function getSimpleQueues(): array;

    /**
     * Get all Queue Types.
     *
     * @return array
     */
    public function getQueueTypes(): array;

    /**
     * Live interface throughput keyed by interface name (router perspective rx/tx bps).
     *
     * @return array<string, array{rx_bps:int, tx_bps:int}>
     */
    public function getInterfaceTrafficStats(): array;

    /**
     * Router interfaces with live rx/tx throughput.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getInterfaces(): array;

    /**
     * Live simple-queue throughput keyed by queue target/name (customer perspective).
     *
     * @return array<string, array{download_bps:int, upload_bps:int}>
     */
    public function getSimpleQueueTrafficStats(): array;

    /**
     * CPU, RAM, and storage usage from RouterOS /system/resource.
     *
     * @return array<string, mixed>
     */
    public function getSystemResources(): array;

    /**
     * Get all Hotspot Servers.
     *
     * @return array
     */
    public function getHotspotServers(): array;

    /**
     * Get all Hotspot Server Profiles.
     *
     * @return array
     */
    public function getHotspotServerProfiles(): array;
}
