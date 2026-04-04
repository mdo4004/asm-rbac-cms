import { useAuth } from '../context/AuthContext';
import useLocationTracker from '../hooks/useLocationTracker';

/**
 * Invisible component — just activates the location tracker hook.
 * Place inside any layout that requires authentication.
 */
export default function LocationTrackerInit() {
  const { user } = useAuth();
  useLocationTracker(!!user);
  return null;
}
