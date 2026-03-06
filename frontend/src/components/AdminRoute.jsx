import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../api/queryHooks';

export default function AdminRoute({ children }) {
    const { data: user, isLoading } = useCurrentUser();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            </div>
        );
    }

    if (!user || user.role !== 'ADMIN') {
        return <Navigate to="/home" replace />;
    }

    return children;
}
