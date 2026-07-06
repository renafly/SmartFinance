import { ProtectedDrawerLayout } from '../../components/protected-drawer';
import { Protected } from '../../navigation/Protected';

export default function ProtectedLayout() {
  return (
    <Protected>
      <ProtectedDrawerLayout />
    </Protected>
  );
}
