import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    CardTitle,
    CardBody,
    Form,
    FormGroup,
    TextInput,
    FormSelect,
    FormSelectOption,
    ActionGroup,
    Button,
    Alert,
    Spinner,
    Split,
    SplitItem,
    Label,
    NumberInput,
    DescriptionList,
    DescriptionListGroup,
    DescriptionListTerm,
    DescriptionListDescription,
    Radio,
    HelperText,
    HelperTextItem
} from '@patternfly/react-core';
import { PlayIcon, StopIcon } from '@patternfly/react-icons';

import { apGetConfig, apSetConfig, apStart, apStop, apStatus, wifiDevices, netInterfaces } from '../../lib/wifi-api';
import type { APConfig, APMode, APStatus, WifiDevice, NetInterface } from '../../lib/types';

const DEFAULT_CONFIG: APConfig = {
    ssid: '',
    passphrase: '',
    address: '192.168.4.1',
    channel: 6,
    band: 'auto',
    interface: '',
    mode: 'router',
    bridgeInterface: '',
    dhcpRangeStart: '192.168.4.20',
    dhcpRangeEnd: '192.168.4.252',
    enabled: false
};

const MODE_DESCRIPTIONS: Record<APMode, string> = {
    router: 'DHCP completo con gateway, DNS e NAT. I client possono navigare in internet tramite questo dispositivo.',
    isolated: 'DHCP assegna solo un IP. I client possono accedere ai servizi del dispositivo (es. Cockpit) ma non navigano in internet. Non interferisce con altre connessioni del client.',
    bridge: 'Nessun DHCP locale. L\'interfaccia WiFi viene collegata in bridge con un\'interfaccia ethernet. Un server DHCP esterno sulla LAN gestisce l\'assegnazione degli indirizzi.'
};

export const AccessPointPage: React.FC = () => {
    const [config, setConfig] = useState<APConfig>(DEFAULT_CONFIG);
    const [status, setStatus] = useState<APStatus | null>(null);
    const [wifiDevs, setWifiDevs] = useState<WifiDevice[]>([]);
    const [ethInterfaces, setEthInterfaces] = useState<NetInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [savedConfig, currentStatus, devs, eths] = await Promise.all([
                apGetConfig(),
                apStatus().catch(() => null),
                wifiDevices(),
                netInterfaces()
            ]);
            if (savedConfig) setConfig(savedConfig);
            setStatus(currentStatus);
            const apDevices = devs.filter(d => d.supportAP);
            setWifiDevs(apDevices);
            setEthInterfaces(eths);
            if (!savedConfig?.interface && apDevices.length > 0) {
                setConfig(prev => ({ ...prev, interface: apDevices[0].device }));
            }
            if (!savedConfig?.bridgeInterface && eths.length > 0) {
                setConfig(prev => ({ ...prev, bridgeInterface: eths[0].device }));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const updateConfig = (field: keyof APConfig, value: string | number | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!config.ssid || config.passphrase.length < 8) {
            setError('SSID obbligatorio e password minimo 8 caratteri');
            return;
        }
        if (config.mode === 'bridge' && !config.bridgeInterface) {
            setError('Seleziona un\'interfaccia ethernet per il bridge');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await apSetConfig(config);
            setSuccess('Configurazione salvata');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async () => {
        setToggling(true);
        setError(null);
        try {
            if (status?.active) {
                await apStop();
                setSuccess('Access Point disattivato');
            } else {
                if (!config.ssid || config.passphrase.length < 8) {
                    setError('Configura SSID e password prima di avviare');
                    setToggling(false);
                    return;
                }
                await apSetConfig(config);
                await apStart();
                setSuccess('Access Point avviato');
            }
            const newStatus = await apStatus().catch(() => null);
            setStatus(newStatus);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return <Spinner size='xl' />;
    }

    const isActive = status?.active ?? false;

    return (
        <>
            {error && <Alert variant='danger' title={error} isInline />}
            {success && <Alert variant='success' title={success} isInline timeout={5000} onTimeout={() => setSuccess(null)} />}

            {/* AP Status & Toggle */}
            <Card>
                <CardTitle>
                    <Split hasGutter>
                        <SplitItem isFilled>Stato Access Point</SplitItem>
                        <SplitItem>
                            <Button
                                variant={isActive ? 'danger' : 'primary'}
                                icon={isActive ? <StopIcon /> : <PlayIcon />}
                                onClick={handleToggle}
                                isLoading={toggling}
                                isDisabled={toggling}
                            >
                                {isActive ? 'Disattiva' : 'Attiva'}
                            </Button>
                        </SplitItem>
                    </Split>
                </CardTitle>
                <CardBody>
                    {isActive
                        ? (
                            <DescriptionList isHorizontal>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>SSID</DescriptionListTerm>
                                    <DescriptionListDescription>{status?.ssid}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Modalità</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        <Label color={config.mode === 'router' ? 'blue' : config.mode === 'isolated' ? 'orange' : 'purple'}>
                                            {config.mode === 'router' ? 'Router' : config.mode === 'isolated' ? 'Rete isolata' : 'Bridge'}
                                        </Label>
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Interfaccia</DescriptionListTerm>
                                    <DescriptionListDescription>{status?.interface}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Client connessi</DescriptionListTerm>
                                    <DescriptionListDescription>{status?.connectedClients}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>DHCP</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        <Label color={status?.dhcpActive ? 'green' : 'grey'}>
                                            {status?.dhcpActive ? 'Attivo' : 'Non attivo'}
                                        </Label>
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                        )
                        : (
                            <Label color='grey'>Access Point non attivo</Label>
                        )}
                </CardBody>
            </Card>

            {/* AP Configuration Form */}
            <Card>
                <CardTitle>Configurazione</CardTitle>
                <CardBody>
                    <Form isHorizontal>
                        <FormGroup label='SSID' fieldId='ap-ssid' isRequired helperText='Nome della rete WiFi (1-32 caratteri)'>
                            <TextInput
                                id='ap-ssid'
                                value={config.ssid}
                                onChange={(_event, val) => updateConfig('ssid', val)}
                                validated={config.ssid.length > 32 ? 'error' : 'default'}
                                isDisabled={isActive}
                            />
                        </FormGroup>

                        <FormGroup label='Password' fieldId='ap-pass' isRequired helperText='Password WPA2/WPA3 (minimo 8 caratteri)'>
                            <TextInput
                                id='ap-pass'
                                type='password'
                                value={config.passphrase}
                                onChange={(_event, val) => updateConfig('passphrase', val)}
                                validated={config.passphrase.length > 0 && config.passphrase.length < 8 ? 'error' : 'default'}
                                isDisabled={isActive}
                            />
                        </FormGroup>

                        <FormGroup label='Interfaccia WiFi' fieldId='ap-iface'>
                            <FormSelect
                                id='ap-iface'
                                value={config.interface}
                                onChange={(_event, val) => updateConfig('interface', val)}
                                isDisabled={isActive}
                            >
                                {wifiDevs.length > 0
                                    ? wifiDevs.map(dev => (
                                        <FormSelectOption
                                            key={dev.device}
                                            value={dev.device}
                                            label={`${dev.device} (${dev.hwAddress})`}
                                        />
                                    ))
                                    : <FormSelectOption value='' label='Nessun dispositivo AP disponibile' />}
                            </FormSelect>
                        </FormGroup>

                        <FormGroup label='Canale' fieldId='ap-channel'>
                            <NumberInput
                                id='ap-channel'
                                value={config.channel}
                                min={1}
                                max={165}
                                onMinus={() => updateConfig('channel', Math.max(1, config.channel - 1))}
                                onPlus={() => updateConfig('channel', Math.min(165, config.channel + 1))}
                                onChange={(event) => {
                                    const val = parseInt((event.target as HTMLInputElement).value, 10);
                                    if (!isNaN(val)) updateConfig('channel', val);
                                }}
                                isDisabled={isActive}
                            />
                        </FormGroup>

                        <FormGroup label='Banda' fieldId='ap-band'>
                            <FormSelect
                                id='ap-band'
                                value={config.band}
                                onChange={(_event, val) => updateConfig('band', val)}
                                isDisabled={isActive}
                            >
                                <FormSelectOption value='auto' label='Automatica' />
                                <FormSelectOption value='2.4GHz' label='2.4 GHz' />
                                <FormSelectOption value='5GHz' label='5 GHz' />
                            </FormSelect>
                        </FormGroup>

                        {/* AP Mode Selection */}
                        <FormGroup label='Modalità rete' fieldId='ap-mode'>
                            <Radio
                                id='ap-mode-router'
                                name='ap-mode'
                                label='Router (DHCP + NAT + Gateway)'
                                isChecked={config.mode === 'router'}
                                onChange={() => updateConfig('mode', 'router')}
                                isDisabled={isActive}
                            />
                            <Radio
                                id='ap-mode-isolated'
                                name='ap-mode'
                                label='Rete isolata (DHCP solo IP)'
                                isChecked={config.mode === 'isolated'}
                                onChange={() => updateConfig('mode', 'isolated')}
                                isDisabled={isActive}
                            />
                            <Radio
                                id='ap-mode-bridge'
                                name='ap-mode'
                                label='Bridge (DHCP esterno)'
                                isChecked={config.mode === 'bridge'}
                                onChange={() => updateConfig('mode', 'bridge')}
                                isDisabled={isActive}
                            />
                            <HelperText>
                                <HelperTextItem variant='indeterminate'>
                                    {MODE_DESCRIPTIONS[config.mode]}
                                </HelperTextItem>
                            </HelperText>
                        </FormGroup>

                        {/* Bridge interface - only in bridge mode */}
                        {config.mode === 'bridge' && (
                            <FormGroup label='Interfaccia bridge' fieldId='ap-bridge-iface' helperText='Interfaccia ethernet da collegare in bridge con il WiFi AP'>
                                <FormSelect
                                    id='ap-bridge-iface'
                                    value={config.bridgeInterface}
                                    onChange={(_event, val) => updateConfig('bridgeInterface', val)}
                                    isDisabled={isActive}
                                >
                                    {ethInterfaces.length > 0
                                        ? ethInterfaces.map(iface => (
                                            <FormSelectOption
                                                key={iface.device}
                                                value={iface.device}
                                                label={`${iface.device} (${iface.state}${iface.connection ? ` - ${iface.connection}` : ''})`}
                                            />
                                        ))
                                        : <FormSelectOption value='' label='Nessuna interfaccia ethernet disponibile' />}
                                </FormSelect>
                            </FormGroup>
                        )}

                        {/* IP and DHCP config - not shown in bridge mode */}
                        {config.mode !== 'bridge' && (
                            <>
                                <FormGroup label='Indirizzo IP' fieldId='ap-addr'>
                                    <TextInput
                                        id='ap-addr'
                                        value={config.address}
                                        onChange={(_event, val) => updateConfig('address', val)}
                                        isDisabled={isActive}
                                    />
                                </FormGroup>

                                <FormGroup label='Range DHCP' fieldId='ap-dhcp'>
                                    <Split hasGutter>
                                        <SplitItem>
                                            <TextInput
                                                id='ap-dhcp-start'
                                                value={config.dhcpRangeStart}
                                                onChange={(_event, val) => updateConfig('dhcpRangeStart', val)}
                                                aria-label='DHCP range start'
                                                isDisabled={isActive}
                                            />
                                        </SplitItem>
                                        <SplitItem>—</SplitItem>
                                        <SplitItem>
                                            <TextInput
                                                id='ap-dhcp-end'
                                                value={config.dhcpRangeEnd}
                                                onChange={(_event, val) => updateConfig('dhcpRangeEnd', val)}
                                                aria-label='DHCP range end'
                                                isDisabled={isActive}
                                            />
                                        </SplitItem>
                                    </Split>
                                </FormGroup>
                            </>
                        )}

                        {/* IP for bridge mode (AP's own IP on the bridge) */}
                        {config.mode === 'bridge' && (
                            <FormGroup label='Indirizzo IP del bridge' fieldId='ap-addr' helperText="IP assegnato all'interfaccia bridge del dispositivo">
                                <TextInput
                                    id='ap-addr'
                                    value={config.address}
                                    onChange={(_event, val) => updateConfig('address', val)}
                                    isDisabled={isActive}
                                />
                            </FormGroup>
                        )}

                        <ActionGroup>
                            <Button
                                variant='primary'
                                onClick={handleSave}
                                isLoading={saving}
                                isDisabled={saving || isActive}
                            >
                                Salva configurazione
                            </Button>
                        </ActionGroup>
                    </Form>
                </CardBody>
            </Card>
        </>
    );
};
