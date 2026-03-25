/** WiFi network discovered via scan */
export interface WifiNetwork {
    ssid: string;
    signal: number;
    security: string;
    frequency: number;
    bssid: string;
    inUse: boolean;
}

/** Saved WiFi connection profile */
export interface WifiConnection {
    id: string;
    uuid: string;
    ssid: string;
    type: string;
    device: string;
    active: boolean;
}

/** Wireless device info */
export interface WifiDevice {
    device: string;
    type: string;
    state: string;
    connection: string;
    hwAddress: string;
    capabilities: string[];
    supportAP: boolean;
}

/** Non-wireless network interface (for bridge port selection) */
export interface NetInterface {
    device: string;
    type: string;
    state: string;
    connection: string;
}

/** AP operating mode */
export type APMode = 'router' | 'isolated' | 'bridge';

/** Access Point configuration */
export interface APConfig {
    ssid: string;
    passphrase: string;
    address: string;
    channel: number;
    band: '2.4GHz' | '5GHz' | 'auto';
    interface: string;
    /** AP operating mode: router (DHCP+NAT+gateway), isolated (DHCP IP-only), bridge (external DHCP) */
    mode: APMode;
    /** Ethernet interface to bridge with AP (only used in bridge mode) */
    bridgeInterface: string;
    dhcpRangeStart: string;
    dhcpRangeEnd: string;
    enabled: boolean;
}

/** WiFi connection status for dashboard */
export interface WifiStatus {
    device: string;
    state: string;
    ssid: string;
    signal: number;
    frequency: number;
    bitrate: string;
    security: string;
    ipAddress: string;
}

/** Access Point runtime status */
export interface APStatus {
    active: boolean;
    ssid: string;
    interface: string;
    connectedClients: number;
    address: string;
    dhcpActive: boolean;
    mode: APMode;
}
