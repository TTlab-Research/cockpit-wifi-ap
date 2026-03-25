import cockpit from 'cockpit';
import type { WifiNetwork, WifiConnection, WifiDevice, NetInterface, APConfig, WifiStatus, APStatus } from './types';

const BIN_PATH = '/usr/share/cockpit/wifi/bin';

/** Spawn a privileged backend script */
function runScript(script: string, args: string[] = []): Promise<string> {
    return cockpit.spawn([`${BIN_PATH}/${script}`, ...args], {
        superuser: 'require',
        err: 'message',
    });
}

/** Scan for available WiFi networks */
export async function wifiScan(): Promise<WifiNetwork[]> {
    const output = await runScript('wifi-scan.py');
    return JSON.parse(output);
}

/** List saved WiFi connections */
export async function wifiListConnections(): Promise<WifiConnection[]> {
    const output = await runScript('wifi-list-connections.py');
    return JSON.parse(output);
}

/** Connect to a WiFi network (password via stdin to avoid ps exposure) */
export async function wifiConnect(ssid: string, password: string): Promise<string> {
    const proc = cockpit.spawn([`${BIN_PATH}/wifi-connect.sh`, ssid], {
        superuser: 'require',
        err: 'message',
    });
    proc.input(password + '\n');
    return proc;
}

/** Disconnect from the current WiFi network */
export async function wifiDisconnect(connectionId: string): Promise<string> {
    return runScript('wifi-disconnect.sh', [connectionId]);
}

/** Delete a saved WiFi connection */
export async function wifiDelete(connectionId: string): Promise<string> {
    return runScript('wifi-delete.sh', [connectionId]);
}

/** Get current WiFi client status */
export async function wifiStatus(): Promise<WifiStatus | null> {
    const output = await runScript('wifi-status.py');
    const data = JSON.parse(output);
    return data.connected ? data : null;
}

/** List available wireless devices */
export async function wifiDevices(): Promise<WifiDevice[]> {
    const output = await runScript('wifi-devices.py');
    return JSON.parse(output);
}

/** List non-wireless interfaces available for bridging */
export async function netInterfaces(): Promise<NetInterface[]> {
    const output = await runScript('net-interfaces.py');
    return JSON.parse(output);
}

/** Get Access Point configuration */
export async function apGetConfig(): Promise<APConfig | null> {
    try {
        const content = await cockpit.file('/etc/cockpit-wifi/ap.conf', {
            superuser: 'try',
        }).read();
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/** Save Access Point configuration */
export async function apSetConfig(config: APConfig): Promise<void> {
    await cockpit.file('/etc/cockpit-wifi/ap.conf', {
        superuser: 'require',
    }).replace(JSON.stringify(config, null, 2));
}

/** Start the Access Point */
export async function apStart(): Promise<string> {
    return runScript('ap-start.sh');
}

/** Stop the Access Point */
export async function apStop(): Promise<string> {
    return runScript('ap-stop.sh');
}

/** Get Access Point runtime status */
export async function apStatus(): Promise<APStatus> {
    const output = await runScript('ap-status.py');
    return JSON.parse(output);
}
