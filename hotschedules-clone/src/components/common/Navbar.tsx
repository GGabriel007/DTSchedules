import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { userProfile, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
      <h1 className="text-lg font-semibold text-gray-800">DT Schedules</h1>
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-800">{userProfile?.displayName}</span>
          <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
            {userProfile?.role}
          </span>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
