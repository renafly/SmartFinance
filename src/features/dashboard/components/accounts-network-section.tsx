import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/data-surface';

import { AccountsNetwork3D } from './accounts-network-3d';
import type { AccountNetworkNode } from '../network-data';

type AccountsNetworkSectionProps = {
  nodes: AccountNetworkNode[];
  totalValue: number;
};

// The "hide values" control used to live here, but it now lives as a
// floating button on the dashboard itself so it can mask every currency
// figure on the screen at once, not just this diagram — see the
// `usePrivacyStore` hook this component (and everything else showing a
// balance) reads from.
export function AccountsNetworkSection({ nodes, totalValue }: AccountsNetworkSectionProps) {
  const { t } = useTranslation('common');

  if (nodes.length === 0) {
    return <EmptyState title={t('dashboard.networkEmptyTitle')} description={t('dashboard.networkEmptyDescription')} icon="git-network-outline" />;
  }

  return <AccountsNetwork3D nodes={nodes} totalLabel={t('dashboard.netWorthTotal')} totalValue={totalValue} />;
}
