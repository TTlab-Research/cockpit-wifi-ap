import React, { useState } from 'react';
import {
    Page,
    PageSection,
    Tabs,
    Tab,
    TabTitleText,
    TabTitleIcon
} from '@patternfly/react-core';
import { WifiIcon, ServerIcon, TachometerAltIcon } from '@patternfly/react-icons';

import { DashboardPage } from './components/Dashboard/DashboardPage';
import { WifiClientPage } from './components/WifiClient/WifiClientPage';
import { AccessPointPage } from './components/AccessPoint/AccessPointPage';

export const Application: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string | number>(0);

    return (
        <Page>
            <PageSection>
                <Tabs
                    activeKey={activeTab}
                    onSelect={(_event, tabIndex) => setActiveTab(tabIndex)}
                    aria-label='WiFi management tabs'
                >
                    <Tab
                        eventKey={0}
                        title={
                            <>
                                <TabTitleIcon><TachometerAltIcon /></TabTitleIcon>
                                <TabTitleText>Dashboard</TabTitleText>
                            </>
                        }
                    >
                        <DashboardPage />
                    </Tab>
                    <Tab
                        eventKey={1}
                        title={
                            <>
                                <TabTitleIcon><WifiIcon /></TabTitleIcon>
                                <TabTitleText>Client WiFi</TabTitleText>
                            </>
                        }
                    >
                        <WifiClientPage />
                    </Tab>
                    <Tab
                        eventKey={2}
                        title={
                            <>
                                <TabTitleIcon><ServerIcon /></TabTitleIcon>
                                <TabTitleText>Access Point</TabTitleText>
                            </>
                        }
                    >
                        <AccessPointPage />
                    </Tab>
                </Tabs>
            </PageSection>
        </Page>
    );
};
