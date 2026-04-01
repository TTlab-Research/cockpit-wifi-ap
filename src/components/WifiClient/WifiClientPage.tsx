import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardTitle,
    CardBody,
    Button,
    Toolbar,
    ToolbarContent,
    ToolbarItem,
    Modal,
    ModalVariant,
    Form,
    FormGroup,
    TextInput,
    ActionGroup,
    Alert,
    Spinner,
    Label
} from '@patternfly/react-core';
import { SyncAltIcon, TrashIcon, PluggedIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';

import { wifiScan, wifiListConnections, wifiConnect, wifiDisconnect, wifiDelete } from '../../lib/wifi-api';
import type { WifiNetwork, WifiConnection } from '../../lib/types';
import { SignalIndicator } from './SignalIndicator';

export const WifiClientPage: React.FC = () => {
    const [networks, setNetworks] = useState<WifiNetwork[]>([]);
    const [connections, setConnections] = useState<WifiConnection[]>([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Connect modal state
    const [connectModal, setConnectModal] = useState(false);
    const [selectedSSID, setSelectedSSID] = useState('');
    const [password, setPassword] = useState('');
    const [connecting, setConnecting] = useState(false);

    const loadConnections = useCallback(async () => {
        try {
            const conns = await wifiListConnections();
            setConnections(conns);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    }, []);

    const handleScan = useCallback(async () => {
        setScanning(true);
        setError(null);
        try {
            const nets = await wifiScan();
            setNetworks(nets);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setScanning(false);
        }
    }, []);

    useEffect(() => {
        handleScan();
        loadConnections();
    }, [handleScan, loadConnections]);

    const openConnectModal = (ssid: string) => {
        setSelectedSSID(ssid);
        setPassword('');
        setConnectModal(true);
    };

    const handleConnect = async () => {
        if (!selectedSSID || password.length < 8) return;
        setConnecting(true);
        setError(null);
        try {
            await wifiConnect(selectedSSID, password);
            setSuccess(`Connesso a "${selectedSSID}"`);
            setConnectModal(false);
            await Promise.all([handleScan(), loadConnections()]);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async (connectionId: string) => {
        setError(null);
        try {
            await wifiDisconnect(connectionId);
            setSuccess('Disconnesso');
            await loadConnections();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    const handleDelete = async (connectionId: string) => {
        setError(null);
        try {
            await wifiDelete(connectionId);
            setSuccess(`Connessione "${connectionId}" eliminata`);
            await loadConnections();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <>
            {error && <Alert variant='danger' title={error} isInline />}
            {success && <Alert variant='success' title={success} isInline timeout={5000} onTimeout={() => setSuccess(null)} />}

            {/* Saved Connections */}
            <Card>
                <CardTitle>Connessioni salvate</CardTitle>
                <CardBody>
                    {connections.length > 0
                        ? (
                            <Table aria-label='Connessioni WiFi salvate' variant='compact'>
                                <Thead>
                                    <Tr>
                                        <Th>Nome</Th>
                                        <Th>SSID</Th>
                                        <Th>Stato</Th>
                                        <Th>Azioni</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {connections.map(conn => (
                                        <Tr key={conn.uuid}>
                                            <Td>{conn.id}</Td>
                                            <Td>{conn.ssid}</Td>
                                            <Td>
                                                <Label color={conn.active ? 'green' : 'grey'}>
                                                    {conn.active ? 'Connesso' : 'Salvata'}
                                                </Label>
                                            </Td>
                                            <Td>
                                                {conn.active
                                                    ? (
                                                        <Button
                                                            variant='secondary'
                                                            size='sm'
                                                            onClick={() => handleDisconnect(conn.id)}
                                                        >
                                                            Disconnetti
                                                        </Button>
                                                    )
                                                    : (
                                                        <Button
                                                            variant='danger'
                                                            size='sm'
                                                            icon={<TrashIcon />}
                                                            onClick={() => handleDelete(conn.id)}
                                                        >
                                                            Elimina
                                                        </Button>
                                                    )}
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        )
                        : 'Nessuna connessione WiFi salvata'}
                </CardBody>
            </Card>

            {/* Available Networks */}
            <Card>
                <CardTitle>
                    <Toolbar>
                        <ToolbarContent>
                            <ToolbarItem>Reti disponibili</ToolbarItem>
                            <ToolbarItem align={{ default: 'alignEnd' }}>
                                <Button
                                    variant='secondary'
                                    icon={<SyncAltIcon />}
                                    onClick={handleScan}
                                    isLoading={scanning}
                                    isDisabled={scanning}
                                >
                                    {scanning ? 'Scansione...' : 'Scansiona'}
                                </Button>
                            </ToolbarItem>
                        </ToolbarContent>
                    </Toolbar>
                </CardTitle>
                <CardBody>
                    {scanning && networks.length === 0
                        ? <Spinner size='lg' />
                        : networks.length > 0
                            ? (
                                <Table aria-label='Reti WiFi disponibili' variant='compact'>
                                    <Thead>
                                        <Tr>
                                            <Th>SSID</Th>
                                            <Th>Segnale</Th>
                                            <Th>Sicurezza</Th>
                                            <Th>Frequenza</Th>
                                            <Th>Azioni</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {networks.map(net => (
                                            <Tr key={`${net.bssid}-${net.ssid}`}>
                                                <Td>
                                                    {net.inUse && <PluggedIcon />}
                                                    {' '}{net.ssid}
                                                </Td>
                                                <Td>
                                                    <SignalIndicator signal={net.signal} />
                                                    {' '}{net.signal}%
                                                </Td>
                                                <Td>{net.security}</Td>
                                                <Td>{net.frequency} MHz</Td>
                                                <Td>
                                                    {!net.inUse && (
                                                        <Button
                                                            variant='primary'
                                                            size='sm'
                                                            onClick={() => openConnectModal(net.ssid)}
                                                        >
                                                            Connetti
                                                        </Button>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            )
                            : 'Nessuna rete trovata. Prova a scansionare.'}
                </CardBody>
            </Card>

            {/* Connect Modal */}
            <Modal
                variant={ModalVariant.small}
                title={`Connetti a "${selectedSSID}"`}
                isOpen={connectModal}
                onClose={() => setConnectModal(false)}
            >
                <Form>
                    <FormGroup label='SSID' fieldId='ssid'>
                        <TextInput id='ssid' value={selectedSSID} isDisabled />
                    </FormGroup>
                    <FormGroup label='Password' fieldId='password' helperText='Minimo 8 caratteri'>
                        <TextInput
                            id='password'
                            type='password'
                            value={password}
                            onChange={(_event, val) => setPassword(val)}
                            validated={password.length > 0 && password.length < 8 ? 'error' : 'default'}
                        />
                    </FormGroup>
                    <ActionGroup>
                        <Button
                            variant='primary'
                            onClick={handleConnect}
                            isLoading={connecting}
                            isDisabled={connecting || password.length < 8}
                        >
                            Connetti
                        </Button>
                        <Button variant='link' onClick={() => setConnectModal(false)}>
                            Annulla
                        </Button>
                    </ActionGroup>
                </Form>
            </Modal>
        </>
    );
};
