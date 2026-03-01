import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { Users, Store, Package, FileText, Shield, RefreshCw } from 'lucide-react';

const AdminDashboard = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const statsRes = await authApi.get('/api/v1/admin/stats');
      setStats(statsRes.data);
      const usersRes = await authApi.get('/api/v1/admin/users?limit=100');
      setUsers(usersRes.data.items || []);
      const vendorsRes = await authApi.get('/api/v1/admin/vendors?limit=100');
      setVendors(vendorsRes.data.items || []);
      const productsRes = await authApi.get('/api/v1/admin/products?limit=100');
      setProducts(productsRes.data.items || []);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVendor = async (vendorId) => {
    try { await authApi.post(`/api/v1/admin/vendors/${vendorId}/approve`); fetchDashboardData(); }
    catch (err) { alert('Failed to approve vendor'); }
  };

  const handleRejectVendor = async (vendorId) => {
    try { await authApi.post(`/api/v1/admin/vendors/${vendorId}/reject`); fetchDashboardData(); }
    catch (err) { alert('Failed to reject vendor'); }
  };

  const handleUpdateUserStatus = async (userId, status) => {
    try { await authApi.put(`/api/v1/admin/users/${userId}/status`, { status }); fetchDashboardData(); }
    catch (err) { alert('Failed to update user status'); }
  };

  const handleUpdateUserRole = async (userId, role) => {
    try { await authApi.put(`/api/v1/admin/users/${userId}/role?role=${role}`); fetchDashboardData(); }
    catch (err) { alert('Failed to update user role'); }
  };

  if (loading) {
    return (<div className="flex items-center justify-center min-h-[60vh]"><div className="spinner-lg"></div></div>);
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 text-lg font-semibold mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="btn-primary"><RefreshCw className="w-4 h-4 mr-2" /> Retry</button>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
    const map = { active: 'badge-success', pending: 'badge-warning', suspended: 'badge-danger' };
    return map[status] || 'badge-neutral';
  };

  const tabs = ['overview', 'users', 'vendors', 'products'];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="hero-section py-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm"><Shield className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-300 text-sm">Manage users, vendors, products, and system statistics</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-solar-500/10 rounded-full blur-3xl" />
      </div>

      <div className="page-container -mt-6 relative z-10">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.users.total, icon: Users, color: 'text-primary-600', bg: 'bg-primary-100' },
              { label: 'Pending Vendors', value: stats.vendors.pending, icon: Store, color: 'text-solar-600', bg: 'bg-solar-100' },
              { label: 'Total Products', value: stats.products.total, icon: Package, color: 'text-eco-600', bg: 'bg-eco-100' },
              { label: 'Estimations', value: stats.estimations.total, icon: FileText, color: 'text-helio-600', bg: 'bg-helio-100' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="stat-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{s.label}</p>
                      <p className="text-2xl font-display font-bold text-slate-900 mt-1">{s.value}</p>
                    </div>
                    <div className={`p-2.5 ${s.bg} rounded-xl`}><Icon className={`w-5 h-5 ${s.color}`} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-6 border-b-2 font-semibold text-sm capitalize transition-colors ${activeTab === tab ? 'border-solar-500 text-solar-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-display font-bold text-slate-900 mb-4">Users by Role</h3>
                  {stats && Object.entries(stats.users.by_role || {}).map(([role, count]) => (
                    <div key={role} className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
                      <span className="capitalize text-slate-600">{role}</span>
                      <span className="font-display font-bold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <h3 className="font-display font-bold text-slate-900 mb-4">Recent Activity</h3>
                  <div className="space-y-2">
                    {stats?.estimations?.recent?.slice(0, 5).map((est) => (
                      <div key={est.id} className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 text-sm">{est.customer_name || 'Unknown'}</span>
                        <span className="text-xs text-slate-400">{new Date(est.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 mb-4">User Management</h2>
                <div className="overflow-x-auto">
                  <table className="premium-table">
                    <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="font-medium text-slate-900">{u.email}</td>
                          <td>{u.full_name}</td>
                          <td>
                            <select value={u.role} onChange={(e) => handleUpdateUserRole(u.id, e.target.value)} className="input-field text-sm py-1 px-2">
                              <option value="guest">Guest</option>
                              <option value="user">User</option>
                              <option value="vendor">Vendor</option>
                              <option value="engineer">Engineer</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td><span className={getStatusBadgeClass(u.status)}>{u.status}</span></td>
                          <td>
                            <select onChange={(e) => { if (e.target.value) { handleUpdateUserStatus(u.id, e.target.value); e.target.value = ''; } }} className="input-field text-sm py-1 px-2" defaultValue="">
                              <option value="" disabled>Change Status</option>
                              <option value="active">Activate</option>
                              <option value="suspended">Suspend</option>
                              <option value="deleted">Delete</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Vendors */}
            {activeTab === 'vendors' && (
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 mb-4">Vendor Management</h2>
                <div className="overflow-x-auto">
                  <table className="premium-table">
                    <thead><tr><th>Business Name</th><th>Type</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {vendors.map((v) => (
                        <tr key={v.id}>
                          <td className="font-medium text-slate-900">{v.business_name}</td>
                          <td>{v.vendor_type || 'N/A'}</td>
                          <td><span className="font-bold">{v.total_products}</span></td>
                          <td><span className={v.is_approved ? 'badge-success' : 'badge-warning'}>{v.is_approved ? 'Approved' : 'Pending'}</span></td>
                          <td>
                            {!v.is_approved && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveVendor(v.id)} className="text-eco-600 hover:text-eco-800 font-semibold text-sm">Approve</button>
                                <button onClick={() => handleRejectVendor(v.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm">Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Products */}
            {activeTab === 'products' && (
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 mb-4">Product Management</h2>
                <div className="overflow-x-auto">
                  <table className="premium-table">
                    <thead><tr><th>Name</th><th>Category</th><th>Vendor</th><th>Status</th><th>Price</th></tr></thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p.id}>
                          <td className="font-medium text-slate-900">{p.name}</td>
                          <td>{p.category}</td>
                          <td>{p.vendor?.business_name || 'N/A'}</td>
                          <td><span className={p.status === 'approved' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}>{p.status}</span></td>
                          <td>{p.price ? `${p.price} ${p.currency}` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;