import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardTitle,
    CardBody,
    DescriptionList,
    DescriptionListGroup,
    DescriptionListTerm,
    DescriptionListDescription,
    Grid,
    GridItem,
    Label,
    Spinner,
    EmptyState,
    EmptyStateBody,
    Button,
} from '@patternfly/react-core';
import {
    WifiIcon,
    ServerIcon,
    SyncAltIcon,
    ConnectedIcon,
    DisconnectedIcon,
} from '@patternfly/react-icons';

import { wifiStatus, apStatus, wifiDevices } from '../../lib/wifi-api';
import type { WifiStatus, APStatus, WifiDevice } from '../../lib/types';
import { SignalIndicator } from '../WifiClient/SignalIndicator';

export const DashboardPage: React.FC = () => {
    const [clientStatus, setClientStatus] = useState<WifiStatus | null>(null);
    const [apState, setApState] = useState<APStatus | null>(null);
    const [devices, setDevices] = useState<WifiDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [ws, as, devs] = await Promise.all([
                wifiStatus(),
                apStatus().catch(() => null),
                wifiDevices(),
            ]);
            setClientStatus(ws);
            setApState(as);
            setDevices(devs);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 10000);
        return () => clearInterval(interval);
    }, [refresh]);

    if (loading && !clientStatus && !apState) {
        return (
            <EmptyState>
                <Spinner size="xl" />
                <EmptyStateBody>Caricamento stato WiFi...</EmptyStateBody>
            </EmptyState>
        );
    }

    if (error) {
        return (
            <EmptyState variant="sm">
                <EmptyStateBody>{error}</EmptyStateBody>
                <Button variant="link" onClick={refresh}>Riprova</Button>
            </EmptyState>
        );
    }

    return (
        <Grid hasGutter>
            {/* WiFi Client Status */}
            <GridItem md={6}>
                <Card>
                    <CardTitle>
                        <WifiIcon /> Client WiFi
                    </CardTitle>
                    <CardBody>
                        {clientStatus
                            ? (
                                <DescriptionList>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Stato</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Label color="green" icon={<ConnectedIcon />}>
                                                Connesso
                                            </Label>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>SSID</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {clientStatus.ssid}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Segnale</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <SignalIndicator signal={clientStatus.signal} />
                                            {' '}{clientStatus.signal}%
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Indirizzo IP</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {clientStatus.ipAddress}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Frequenza</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {clientStatus.frequency} MHz
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Sicurezza</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {clientStatus.security}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                </DescriptionList>
                            )
                            : (
                                <Label color="grey" icon={<DisconnectedIcon />}>
                                    Non connesso
                                </Label>
                            )
                        }
                    </CardBody>
                </Card>
            </GridItem>

            {/* Access Point Status */}
            <GridItem md={6}>
                <Card>
                    <CardTitle>
                        <ServerIcon /> Access Point
                    </CardTitle>
                    <CardBody>
                        {apState?.active
                            ? (
                                <DescriptionList>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Stato</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Label color="green" icon={<ConnectedIcon />}>
                                                Attivo
                                            </Label>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>SSID</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {apState.ssid}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Modalità</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Label color={apState.mode === 'router' ? 'blue' : apState.mode === 'isolated' ? 'orange' : 'purple'}>
                                                {apState.mode === 'router' ? 'Router' : apState.mode === 'isolated' ? 'Rete isolata' : 'Bridge'}
                                            </Label>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Interfaccia</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {apState.interface}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Client connessi</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {apState.connectedClients}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>Indirizzo</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            {apState.address}
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                    <DescriptionListGroup>
                                        <DescriptionListTerm>DHCP</DescriptionListTerm>
                                        <DescriptionListDescription>
                                            <Label color={apState.dhcpActive ? 'green' : 'grey'}>
                                                {apState.dhcpActive ? 'Attivo' : 'Non attivo'}
                                            </Label>
                                        </DescriptionListDescription>
                                    </DescriptionListGroup>
                                </DescriptionList>
                            )
                            : (
                                <Label color="grey" icon={<DisconnectedIcon />}>
                                    Non attivo
                                </Label>
                            )
                        }
                    </CardBody>
                </Card>
            </GridItem>

            {/* Wireless Devices */}
            <GridItem>
                <Card>
                    <CardTitle>
                        <SyncAltIcon /> Dispositivi Wireless
                    </CardTitle>
                    <CardBody>
                        {devices.length > 0
                            ? (
                                <DescriptionList isHorizontal>
                                    {devices.map(dev => (
                                        <DescriptionListGroup key={dev.device}>
                                            <DescriptionListTerm>{dev.device}</DescriptionListTerm>
                                            <DescriptionListDescription>
                                                <Label color={dev.state === 'connected' ? 'green' : 'grey'}>
                                                    {dev.state}
                                                </Label>
                                                {' '}
                                                {dev.connection && `(${dev.connection})`}
                                                {dev.supportAP && (
                                                    <Label color="blue" isCompact>
                                                        AP supportato
                                                    </Label>
                                                )}
                                            </DescriptionListDescription>
                                        </DescriptionListGroup>
                                    ))}
                                </DescriptionList>
                            )
                            : 'Nessun dispositivo wireless rilevato'
                        }
                    </CardBody>
                </Card>
            </GridItem>
        </Grid>
    );
};
