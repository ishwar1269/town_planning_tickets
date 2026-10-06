import React, { useState, useEffect, useRef } from 'react';

export default function TechnicianManagerModal({ 
  technicians = [], 
  categories = [], 
  onClose, 
  onRefresh,
  onOpenBrandingModal
}) {
  // Navigation State (Left Sidebar Tabs)
  const [mainNavTab, setMainNavTab] = useState('users'); // 'users' | 'create' | 'categories'
  
  // Category Creation & Editing State
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatGroup, setEditCatGroup] = useState('');
  const [savingCatEdit, setSavingCatEdit] = useState(false);
  const [searchCatQuery, setSearchCatQuery] = useState('');
  
  // Users List State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeRoleTab, setActiveRoleTab] = useState('all');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Form State for Creating New User ID
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('technician');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [loading, setLoading] = useState(false);

  // Password Reveal & Reset Password state
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [editingPasswordUserId, setEditingPasswordUserId] = useState(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [savingResetPass, setSavingResetPass] = useState(false);

  // Dedicated Category Selection Popup Modal State
  const [categoryPopup, setCategoryPopup] = useState({
    isOpen: false,
    targetUser: null, // null means creating new user, otherwise user object
    tempSelectedCatIds: [],
    search: '',
    saving: false
  });

  // Edit User Account Modal State
  const [editUserModal, setEditUserModal] = useState({
    isOpen: false,
    user: null,
    name: '',
    email: '',
    password: '',
    role: 'user',
    designation: '',
    phone: '',
    category_ids: [],
    searchCategory: '',
    showPassword: false,
    saving: false,
    error: null
  });

  // Roles Management State
  const [rolesList, setRolesList] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleAccess, setNewRoleAccess] = useState('Custom Level');
  const [creatingRole, setCreatingRole] = useState(false);

  const handleOpenEditUserModal = (userItem) => {
    setEditUserModal({
      isOpen: true,
      user: userItem,
      name: userItem.name || '',
      email: userItem.email || '',
      password: userItem.password || '',
      role: userItem.role || 'user',
      designation: userItem.designation || '',
      phone: userItem.phone || '',
      category_ids: Array.isArray(userItem.category_ids) ? [...userItem.category_ids] : [],
      searchCategory: '',
      showPassword: false,
      saving: false,
      error: null
    });
  };

  const handleSaveEditUser = async (e) => {
    if (e) e.preventDefault();
    if (!editUserModal.name.trim()) {
      setEditUserModal(prev => ({ ...prev, error: 'User Full Name is required' }));
      return;
    }
    if (!editUserModal.email.trim()) {
      setEditUserModal(prev => ({ ...prev, error: 'Email ID (login username) is required' }));
      return;
    }

    setEditUserModal(prev => ({ ...prev, saving: true, error: null }));

    try {
      const res = await fetch(`/api/users/${editUserModal.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editUserModal.name.trim(),
          email: editUserModal.email.trim(),
          password: editUserModal.password.trim(),
          role: editUserModal.role,
          designation: editUserModal.designation.trim(),
          phone: editUserModal.phone.trim(),
          category_ids: editUserModal.category_ids
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user account');
      }

      alert(`User account "${editUserModal.name}" details updated successfully!`);
      setEditUserModal(prev => ({ ...prev, isOpen: false, saving: false }));
      fetchUsers();
      if (onRefresh) onRefresh();
    } catch (err) {
      setEditUserModal(prev => ({ ...prev, saving: false, error: err.message }));
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRolesList(data);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      alert('Please enter a Role Name');
      return;
    }
    setCreatingRole(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: newRoleName.trim(),
          description: newRoleDesc.trim(),
          access_level: newRoleAccess
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create role');

      setNewRoleName('');
      setNewRoleDesc('');
      setNewRoleAccess('Custom Level');
      fetchRoles();
      alert(`Role "${data.role_name}" created successfully!`);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete custom role "${roleName}"?`)) return;
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete role');
      fetchRoles();
      alert(`Role "${roleName}" deleted successfully!`);
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      alert('Please enter a Category Name');
      return;
    }
    setCreatingCat(true);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), group_name: newCatGroup.trim() || 'General Support' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create category');

      setNewCatName('');
      setNewCatGroup('');
      if (onRefresh) onRefresh();
      alert(`Category "${data.name}" created successfully!`);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingCat(false);
    }
  };

  const handleStartEditCategory = (cat) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatGroup(cat.group_name || 'General Support');
  };

  const handleCancelEditCategory = () => {
    setEditingCatId(null);
    setEditCatName('');
    setEditCatGroup('');
  };

  const handleSaveEditCategory = async (catId) => {
    if (!editCatName.trim()) {
      alert('Please enter a Category Name');
      return;
    }

    setSavingCatEdit(true);
    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCatName.trim(),
          group_name: editCatGroup.trim() || 'General Support'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update category');

      alert(`Category "${data.category?.name || editCatName}" updated successfully!`);
      setEditingCatId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingCatEdit(false);
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`Are you sure you want to delete service category "${catName}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete category');

      alert(data.message || `Category "${catName}" deleted successfully!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Open Category Selection Popup for Existing User / Technician
  const handleOpenCategoryPopupForUser = (userItem) => {
    setCategoryPopup({
      isOpen: true,
      targetUser: userItem,
      tempSelectedCatIds: userItem.category_ids || [],
      search: '',
      saving: false
    });
  };

  // Open Category Selection Popup for New User Form
  const handleOpenCategoryPopupForNewUser = () => {
    setCategoryPopup({
      isOpen: true,
      targetUser: null,
      tempSelectedCatIds: [...selectedCatIds],
      search: '',
      saving: false
    });
  };

  // Toggle Category selection inside Popup
  const togglePopupCatSelection = (catId) => {
    setCategoryPopup(prev => {
      const exists = prev.tempSelectedCatIds.includes(catId);
      const updated = exists 
        ? prev.tempSelectedCatIds.filter(id => id !== catId)
        : [...prev.tempSelectedCatIds, catId];
      return { ...prev, tempSelectedCatIds: updated };
    });
  };

  // Select All / Deselect All inside Category Popup
  const handlePopupSelectAll = () => {
    setCategoryPopup(prev => ({
      ...prev,
      tempSelectedCatIds: categories.map(c => c.id)
    }));
  };

  const handlePopupClearAll = () => {
    setCategoryPopup(prev => ({
      ...prev,
      tempSelectedCatIds: []
    }));
  };

  // Save Category Selections from Popup
  const handleSaveCategoryPopup = async () => {
    const { targetUser, tempSelectedCatIds } = categoryPopup;

    if (!targetUser) {
      // For New User Form
      setSelectedCatIds(tempSelectedCatIds);
      setCategoryPopup(prev => ({ ...prev, isOpen: false }));
      return;
    }

    setCategoryPopup(prev => ({ ...prev, saving: true }));

    try {
      const res = await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetUser.name,
          email: targetUser.email,
          password: targetUser.password,
          role: targetUser.role,
          designation: targetUser.designation || '',
          phone: targetUser.phone || '',
          category_ids: tempSelectedCatIds
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update category allocations');

      alert(`Categories updated successfully for ${targetUser.name}!`);
      setCategoryPopup(prev => ({ ...prev, isOpen: false, saving: false }));
      fetchUsers();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
      setCategoryPopup(prev => ({ ...prev, saving: false }));
    }
  };

  const handleAddUserOrTech = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password,
          role,
          designation, 
          phone,
          category_ids: selectedCatIds
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user account');
      }

      alert(data.message || `User account (${role.toUpperCase()}) created successfully!`);

      setName('');
      setEmail('');
      setPassword('');
      setDesignation('');
      setPhone('');
      setSelectedCatIds([]);
      fetchUsers();
      onRefresh();
      setMainNavTab('users'); // Switch back to users list to view new user
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (userId) => {
    if (!newResetPassword.trim()) {
      alert('Please enter a new password');
      return;
    }
    setSavingResetPass(true);

    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newResetPassword.trim() })
      });

      if (!res.ok) throw new Error('Failed to reset password');
      alert('User password updated successfully!');
      setEditingPasswordUserId(null);
      setNewResetPassword('');
      fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingResetPass(false);
    }
  };

  const handleDeactivateUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to deactivate user account "${userName}"? The user will be moved to the Deactivated Users tab and all their ticket data will remain 100% active.`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate user');
      alert(`User account "${userName}" deactivated and moved to Deactivated Users tab.`);
      fetchUsers();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleActivateUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to reactivate user account "${userName}"?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}/restore`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to activate user');
      alert(`User account "${userName}" reactivated successfully!`);
      fetchUsers();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const getCategoryNames = (catIds = []) => {
    if (!catIds || catIds.length === 0) return 'No Categories';
    if (catIds.length === categories.length) return 'All Categories';
    return categories
      .filter(c => catIds.includes(c.id))
      .map(c => c.name)
      .join(', ');
  };

  const getRoleBadgeUI = (roleVal) => {
    switch (roleVal) {
      case 'admin':
        return <span className="zoho-pill-count" style={{ background: '#FEF3C7', color: '#D97706', border: '1px solid #FCD34D' }}>👑 Admin</span>;
      case 'universal':
        return <span className="zoho-pill-count" style={{ background: '#F3E8FF', color: '#7C3AED', border: '1px solid #C084FC' }}>🌐 Universal Operator</span>;
      case 'technician':
        return <span className="zoho-pill-count" style={{ background: '#DBEAFE', color: '#0265DC', border: '1px solid #93C5FD' }}>🛠️ Technician</span>;
      default:
        return <span className="zoho-pill-count" style={{ background: '#D1FAE5', color: '#059669', border: '1px solid #6EE7B7' }}>👤 Citizen User</span>;
    }
  };

  // Filtered Active & Soft-Deleted Users Lists (Search + Role Tab)
  const activeUsers = usersList.filter(u => Number(u.is_deleted) !== 1);
  const deletedUsersList = usersList.filter(u => Number(u.is_deleted) === 1);

  const filteredUsers = activeUsers.filter(u => {
    const matchesRole = activeRoleTab === 'all' || u.role === activeRoleTab;
    const query = searchUserQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      u.name.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="zoho-modal-overlay">
      <div className="zoho-modal-card admin-console-modal">
        {/* Header */}
        <div className="admin-console-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#0265DC', padding: '8px 12px', borderRadius: '8px', color: '#fff', fontSize: '1.2rem' }}>
              <i className="fa-solid fa-user-gear"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.2px', margin: 0 }}>
                Admin Console • User Account Directory & Category Allocations
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                Manage all system user IDs, credentials, passwords, and department category assignments.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ background: 'rgba(254, 243, 199, 0.15)', color: '#FBBF24', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.78rem' }}>
              <i className="fa-solid fa-shield-halved"></i> <strong>Super Admin Logged In</strong>
            </span>
            <button className="zoho-modal-close" style={{ color: '#94A3B8' }} onClick={onClose}>&times;</button>
          </div>
        </div>

        {/* Main Body: Left Sidebar Tabs + Right Workspace */}
        <div className="admin-console-layout">
          {/* Left Navigation Sidebar */}
          <aside className="admin-sidebar">
            <div className="admin-nav-group">
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '6px' }}>
                Administration Console
              </div>

              <button 
                className={`admin-nav-btn ${mainNavTab === 'users' ? 'active' : ''}`}
                onClick={() => setMainNavTab('users')}
              >
                <i className="fa-solid fa-users-gear" style={{ fontSize: '1rem' }}></i>
                <span>User Directory</span>
                <span className="admin-nav-badge">{activeUsers.length}</span>
              </button>

              <button 
                className={`admin-nav-btn ${mainNavTab === 'create' ? 'active' : ''}`}
                onClick={() => setMainNavTab('create')}
              >
                <i className="fa-solid fa-user-plus" style={{ fontSize: '1rem' }}></i>
                <span>Add New User</span>
                <span className="admin-nav-badge" style={{ background: '#DBEAFE', color: '#0265DC' }}>+ Add</span>
              </button>

              <button 
                className={`admin-nav-btn ${mainNavTab === 'roles' ? 'active' : ''}`}
                onClick={() => setMainNavTab('roles')}
              >
                <i className="fa-solid fa-user-shield" style={{ fontSize: '1rem', color: '#8B5CF6' }}></i>
                <span>Roles & Access Control</span>
                <span className="admin-nav-badge" style={{ background: 'rgba(139, 92, 246, 0.18)', color: '#8B5CF6' }}>
                  {rolesList.length}
                </span>
              </button>

              <button 
                className={`admin-nav-btn ${mainNavTab === 'categories' ? 'active' : ''}`}
                onClick={() => setMainNavTab('categories')}
              >
                <i className="fa-solid fa-layer-group" style={{ fontSize: '1rem', color: '#4338CA' }}></i>
                <span>Service Categories</span>
                <span className="admin-nav-badge" style={{ background: '#E0E7FF', color: '#4338CA' }}>{categories.length}</span>
              </button>

              <button 
                className={`admin-nav-btn ${mainNavTab === 'deleted' ? 'active' : ''}`}
                onClick={() => setMainNavTab('deleted')}
              >
                <i className="fa-solid fa-user-slash" style={{ fontSize: '1rem', color: '#EF4444' }}></i>
                <span>Archived & Inactive Accounts</span>
                <span className="admin-nav-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                  {deletedUsersList.length}
                </span>
              </button>

              <button 
                className="admin-nav-btn"
                onClick={() => {
                  onClose();
                  if (onOpenBrandingModal) onOpenBrandingModal();
                }}
                style={{ borderColor: '#38BDF8', color: '#0284C7', background: 'rgba(56, 189, 248, 0.08)' }}
              >
                <i className="fa-solid fa-sliders" style={{ fontSize: '1rem', color: '#0284C7' }}></i>
                <span>Portal & Organization Settings</span>
                <span className="admin-nav-badge" style={{ background: '#0284C7', color: '#FFFFFF' }}>Config</span>
              </button>
            </div>

            {/* Sidebar Stats & Info Card */}
            <div style={{ background: 'var(--card-bg)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                <i className="fa-solid fa-chart-pie" style={{ color: 'var(--zoho-blue)' }}></i> Role Distribution Summary
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem' }}>
                <div style={{ background: 'var(--zoho-warning-bg)', padding: '6px', borderRadius: '4px', color: 'var(--zoho-warning)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <strong>{activeUsers.filter(u => u.role === 'admin').length}</strong> Administrators
                </div>
                <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '6px', borderRadius: '4px', color: '#A78BFA', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <strong>{activeUsers.filter(u => u.role === 'universal').length}</strong> Helpdesk Ops
                </div>
                <div style={{ background: 'var(--zoho-blue-light)', padding: '6px', borderRadius: '4px', color: 'var(--zoho-blue)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <strong>{activeUsers.filter(u => u.role === 'technician').length}</strong> Specialists
                </div>
                <div style={{ background: 'var(--zoho-success-bg)', padding: '6px', borderRadius: '4px', color: 'var(--zoho-success)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <strong>{activeUsers.filter(u => u.role === 'user').length}</strong> Citizen Users
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-key" style={{ color: '#D97706' }}></i> <strong>Primary Super Admin:</strong><br />
                <code>{activeUsers.find(u => u.role === 'admin')?.email || 'ishwarsahu1269@gmail.com'}</code>
              </div>
            </div>
          </aside>

          {/* Right Main Content Area */}
          <main className="admin-content-area">
            {/* TAB 1: User Accounts Directory */}
            {mainNavTab === 'users' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                      <i className="fa-solid fa-address-book" style={{ color: 'var(--zoho-blue)' }}></i> Registered User Accounts & Passwords
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Click on any user's category pill or the <strong>Categories</strong> button to select/assign categories in a popup modal.
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', width: '280px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}></i>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search user name or email..." 
                      value={searchUserQuery} 
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      style={{ paddingLeft: '34px', fontSize: '0.8rem', height: '36px' }}
                    />
                  </div>
                </div>

                {/* Role Tabs Pill Filter */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button 
                    className={`btn btn-zoho-secondary btn-xs ${activeRoleTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveRoleTab('all')}
                  >
                    All Accounts ({activeUsers.length})
                  </button>

                  <button 
                    className={`btn btn-zoho-secondary btn-xs ${activeRoleTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setActiveRoleTab('admin')}
                  >
                    👑 Admins ({activeUsers.filter(u => u.role === 'admin').length})
                  </button>

                  <button 
                    className={`btn btn-zoho-secondary btn-xs ${activeRoleTab === 'universal' ? 'active' : ''}`}
                    onClick={() => setActiveRoleTab('universal')}
                  >
                    🌐 Universal Operators ({activeUsers.filter(u => u.role === 'universal').length})
                  </button>

                  <button 
                    className={`btn btn-zoho-secondary btn-xs ${activeRoleTab === 'technician' ? 'active' : ''}`}
                    onClick={() => setActiveRoleTab('technician')}
                  >
                    🛠️ Technicians ({activeUsers.filter(u => u.role === 'technician').length})
                  </button>

                  <button 
                    className={`btn btn-zoho-secondary btn-xs ${activeRoleTab === 'user' ? 'active' : ''}`}
                    onClick={() => setActiveRoleTab('user')}
                  >
                    👤 Citizen Users ({activeUsers.filter(u => u.role === 'user').length})
                  </button>
                </div>

                {/* Directory Table */}
                <div className="zoho-table-card" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <table className="zoho-table" style={{ minWidth: '880px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: '160px' }}>User / Specialist Name</th>
                        <th style={{ minWidth: '120px' }}>Role</th>
                        <th style={{ minWidth: '180px' }}>Login Email ID</th>
                        <th style={{ minWidth: '130px' }}>Account Password</th>
                        <th style={{ minWidth: '150px' }}>Assigned Categories</th>
                        <th style={{ textAlign: 'right', minWidth: '140px', whiteSpace: 'nowrap' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                            <i className="fa-solid fa-spinner fa-spin fa-lg" style={{ color: 'var(--zoho-blue)' }}></i>
                            <p style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading user accounts...</p>
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No user accounts match your search or role filter.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(item => {
                          const isEditingPassword = editingPasswordUserId === item.id;
                          const isPassRevealed = visiblePasswords[item.id];
                          const catCount = item.category_ids?.length || 0;

                          return (
                            <tr key={item.id}>
                              <td>
                                <div className="zoho-tech-cell">
                                  <div className="zoho-tech-avatar">
                                    {item.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <strong style={{ display: 'block', fontSize: '0.84rem' }}>{item.name}</strong>
                                    {item.technician_id && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tech ID: #{item.technician_id}</span>}
                                  </div>
                                </div>
                              </td>

                              <td>{getRoleBadgeUI(item.role)}</td>

                              <td><code style={{ fontSize: '0.78rem' }}>{item.email}</code></td>

                              {/* Password Column with Hide/Show & Reset */}
                              <td>
                                {isEditingPassword ? (
                                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input 
                                      type="text" 
                                      className="form-control" 
                                      placeholder="New Password..."
                                      style={{ padding: '2px 6px', fontSize: '0.76rem', width: '110px' }}
                                      value={newResetPassword}
                                      onChange={(e) => setNewResetPassword(e.target.value)}
                                    />
                                    <button className="btn btn-zoho-excel btn-xs" onClick={() => handleResetPasswordSubmit(item.id)} disabled={savingResetPass}>
                                      Save
                                    </button>
                                    <button className="btn btn-zoho-secondary btn-xs" onClick={() => setEditingPasswordUserId(null)}>Cancel</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <code style={{ 
                                      background: 'var(--input-bg)', 
                                      color: 'var(--input-text)', 
                                      border: '1px solid var(--input-border)', 
                                      padding: '3px 8px', 
                                      borderRadius: '4px', 
                                      fontWeight: '800', 
                                      fontSize: '0.8rem',
                                      letterSpacing: isPassRevealed ? '0.5px' : '2px'
                                    }}>
                                      {isPassRevealed ? item.password : '••••••••'}
                                    </code>
                                    <button 
                                      className="btn btn-zoho-secondary btn-xs" 
                                      style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                                      onClick={() => togglePasswordVisibility(item.id)}
                                      title={isPassRevealed ? 'Hide Password' : 'Show Password'}
                                    >
                                      <i className={`fa-solid ${isPassRevealed ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Categories Column with Interactive Popup Opener */}
                              <td>
                                <button 
                                  className="btn btn-zoho-secondary btn-xs" 
                                  onClick={() => handleOpenCategoryPopupForUser(item)}
                                  style={{ 
                                    background: catCount > 0 ? 'var(--zoho-blue-light)' : 'var(--card-bg)',
                                    borderColor: catCount > 0 ? 'var(--zoho-blue)' : 'var(--border-color)',
                                    color: catCount > 0 ? 'var(--zoho-blue)' : 'var(--text-muted)',
                                    fontWeight: 600
                                  }}
                                  title="Click to assign or modify department categories"
                                >
                                  <i className="fa-solid fa-layer-group"></i> 
                                  {catCount === categories.length ? ' All Categories' : catCount > 0 ? ` ${catCount} Categories` : ' Assign Categories'}
                                </button>
                              </td>

                              {/* Action Buttons */}
                              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {/* Edit Details Button */}
                                  <button 
                                    className="btn btn-xs" 
                                    onClick={() => handleOpenEditUserModal(item)}
                                    title="Edit Username, Email, Role, Password & Category Details"
                                    style={{
                                      background: '#0D9488',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 2px 4px rgba(13, 148, 136, 0.25)'
                                    }}
                                  >
                                    <i className="fa-solid fa-pen-to-square"></i> Edit
                                  </button>

                                  {/* Reset Password Button */}
                                  {!isEditingPassword && (
                                    <button 
                                      className="btn btn-xs" 
                                      onClick={() => { setEditingPasswordUserId(item.id); setNewResetPassword(item.password); }}
                                      title="Quick Reset Password"
                                      style={{
                                        background: '#0265DC',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 4px rgba(2, 101, 220, 0.25)'
                                      }}
                                    >
                                      <i className="fa-solid fa-key"></i> Reset
                                    </button>
                                  )}

                                  {/* Deactivate User Account */}
                                  <button 
                                    className="btn btn-xs" 
                                    style={{ 
                                      color: '#FFFFFF', 
                                      borderColor: '#DC2626', 
                                      background: '#EF4444', 
                                      fontWeight: 700,
                                      borderRadius: '6px',
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                                      opacity: 1,
                                      pointerEvents: 'auto'
                                    }} 
                                    onClick={() => handleDeactivateUser(item.id, item.name)} 
                                    title="Deactivate user account (Move to Deactivated Users tab)"
                                  >
                                    <i className="fa-solid fa-user-xmark"></i> Deactivate
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Add New User */}
            {mainNavTab === 'create' && (
              <div style={{ maxWidth: '780px', margin: '0 auto' }}>
                <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div style={{ background: '#0265DC', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-user-plus"></i>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                        Provision New User Account
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                        Register a new user credential and assign service category permissions.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddUserOrTech}>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>User / Specialist Full Name *</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. Rajesh Kumar" 
                          required 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                        />
                      </div>

                      <div className="form-group">
                        <label>Account Role *</label>
                        <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
                          {rolesList.length > 0 ? (
                            rolesList.map(r => (
                              <option key={r.id || r.role_key} value={r.role_key}>
                                {r.role_key === 'admin' ? '👑 ' : r.role_key === 'universal' ? '🌐 ' : r.role_key === 'technician' ? '🛠️ ' : r.role_key === 'user' ? '👤 ' : '⚡ '}
                                {r.role_name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="technician">🛠️ Technician Specialist</option>
                              <option value="universal">🌐 Universal Operator</option>
                              <option value="user">👤 Citizen User</option>
                              <option value="admin">👑 Administrator</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Email ID (Login Username) *</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          placeholder="e.g. rajesh@townplanning.gov.in" 
                          required 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          Account Password *
                          <button 
                            type="button" 
                            onClick={generateRandomPassword}
                            style={{ background: 'none', border: 'none', color: 'var(--zoho-blue)', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '8px', textDecoration: 'underline' }}
                          >
                            Generate Random
                          </button>
                        </label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Set password (e.g. Pass@123)..." 
                          required 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Phone / Contact Number (Optional)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. +91 9876543210" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                        />
                      </div>

                      <div className="form-group">
                        <label>Department Designation (Optional)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="e.g. Senior Town Planner" 
                          value={designation} 
                          onChange={(e) => setDesignation(e.target.value)} 
                        />
                      </div>
                    </div>

                    {/* Category Selection Box for Technician */}
                    {role === 'technician' && (
                      <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-layer-group" style={{ color: 'var(--zoho-blue)' }}></i> Department Categories Selection
                            </strong>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {selectedCatIds.length} categories selected for this technician
                            </div>
                          </div>

                          <button 
                            type="button" 
                            className="btn btn-zoho-excel btn-sm"
                            onClick={handleOpenCategoryPopupForNewUser}
                          >
                            <i className="fa-solid fa-sliders"></i> Select Categories in Popup
                          </button>
                        </div>

                        {/* Preview Selected Categories */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '36px', alignItems: 'center', background: 'var(--bg-body)', padding: '8px 12px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                          {selectedCatIds.length === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              No categories selected yet. Click button above to pick categories in popup.
                            </span>
                          ) : (
                            categories.filter(c => selectedCatIds.includes(c.id)).map(cat => (
                              <span key={cat.id} className="zoho-cat-tag" style={{ fontSize: '0.75rem', background: '#DBEAFE', color: '#0265DC', border: '1px solid #93C5FD' }}>
                                <i className="fa-solid fa-check"></i> {cat.name}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                      <button 
                        type="button" 
                        className="btn btn-zoho-secondary"
                        onClick={() => setMainNavTab('users')}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-zoho-primary" 
                        disabled={loading}
                        style={{ padding: '8px 24px' }}
                      >
                        {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-check"></i>} Register & Provision Account
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SYSTEM ROLES & PERMISSIONS MANAGEMENT TAB */}
            {mainNavTab === 'roles' && (
              <div className="admin-content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-user-shield" style={{ color: '#8B5CF6' }}></i> System Roles & Permission Allocation Manager
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Create custom system roles, configure access levels, and inspect active user account assignments.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Left Form: Create New Role */}
                  <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-shield-plus" style={{ color: '#8B5CF6' }}></i> Create New System / Custom Role
                    </h4>

                    <form onSubmit={handleCreateRole}>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                          Role Title / Name *
                        </label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="e.g. Field Supervisor / Department Inspector"
                          required
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                          Access Level Classification
                        </label>
                        <select 
                          className="form-control"
                          value={newRoleAccess}
                          onChange={(e) => setNewRoleAccess(e.target.value)}
                        >
                          <option value="Super Admin">👑 Super Admin (Full Control)</option>
                          <option value="Universal Support">🌐 Universal Support (All Categories)</option>
                          <option value="Technician">🛠️ Specialist Technician (Assigned Category)</option>
                          <option value="Department Inspector">🔍 Department Inspector</option>
                          <option value="Citizen User">👤 Citizen User (Portal Access)</option>
                          <option value="Custom Level">⚡ Custom Access Level</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                          Role Scope & Description
                        </label>
                        <textarea 
                          className="form-control"
                          rows="3"
                          placeholder="Describe role responsibilities, department scope, or access privileges..."
                          value={newRoleDesc}
                          onChange={(e) => setNewRoleDesc(e.target.value)}
                          style={{ resize: 'none', fontSize: '0.8rem' }}
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-zoho-primary" 
                        disabled={creatingRole}
                        style={{ width: '100%', fontWeight: 700, justifyContent: 'center', background: '#8B5CF6', borderColor: '#7C3AED' }}
                      >
                        {creatingRole ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-double"></i>} Save & Register Role
                      </button>
                    </form>
                  </div>

                  {/* Right List: All Registered Roles */}
                  <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxHeight: '440px', overflowY: 'auto' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span><i className="fa-solid fa-id-card-clip" style={{ color: '#8B5CF6' }}></i> Registered System Roles ({rolesList.length})</span>
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rolesList.map((r, idx) => (
                        <div 
                          key={r.id || idx}
                          style={{
                            background: 'var(--bg-body)', 
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)', 
                            padding: '12px 14px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {r.role_key === 'admin' ? '👑' : r.role_key === 'universal' ? '🌐' : r.role_key === 'technician' ? '🛠️' : r.role_key === 'user' ? '👤' : '⚡'}
                              {r.role_name}
                              <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '4px' }}>
                                {r.role_key}
                              </code>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', background: r.is_system ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)', color: r.is_system ? '#3B82F6' : '#8B5CF6', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, border: '1px solid var(--border-color)' }}>
                                {r.is_system ? 'Built-in System' : 'Custom Role'}
                              </span>
                              {!r.is_system && (
                                <button 
                                  className="btn btn-zoho-secondary btn-xs"
                                  style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', padding: '2px 6px' }}
                                  onClick={() => handleDeleteRole(r.id, r.role_name)}
                                  title="Delete Custom Role"
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            {r.description || 'No description specified for this role.'}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                            <span>Access: <strong>{r.access_level || 'Standard'}</strong></span>
                            <span>Assigned Accounts: <strong style={{ color: 'var(--zoho-blue)' }}>{r.user_count || 0} Accounts</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORIES MANAGEMENT TAB */}
            {mainNavTab === 'categories' && (
              <div className="admin-content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-folder-plus" style={{ color: '#4338CA' }}></i> Department Categories Directory & Creation
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Create new helpdesk categories and view existing category allocations.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Left Form: Create New Category */}
                  <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-circle-plus" style={{ color: 'var(--zoho-blue)' }}></i> Create New Ticket Category
                    </h4>

                    <form onSubmit={handleCreateCategory}>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                          Category Name *
                        </label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="e.g. LABOUR CESS / WATER TAX / IT INFRASTRUCTURE"
                          required
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                          Department Group / Wing Name
                        </label>
                        <input 
                          type="text" 
                          className="form-control"
                          placeholder="e.g. Municipal Revenue Wing / Technical Support"
                          value={newCatGroup}
                          onChange={(e) => setNewCatGroup(e.target.value)}
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-zoho-primary" 
                        disabled={creatingCat}
                        style={{ width: '100%', fontWeight: 700, justifyContent: 'center' }}
                      >
                        {creatingCat ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-folder-plus"></i>} Save & Add New Category
                      </button>
                    </form>
                  </div>

                  {/* Right List: All Existing Categories with Search, Edit & Delete */}
                  <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxHeight: '460px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-list-check" style={{ color: '#4338CA' }}></i> Existing Categories ({categories.length})
                      </h4>
                    </div>

                    {/* Search / Filter Input */}
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.74rem' }}></i>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Filter categories by name or group..." 
                        value={searchCatQuery}
                        onChange={(e) => setSearchCatQuery(e.target.value)}
                        style={{ paddingLeft: '28px', fontSize: '0.78rem', height: '32px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
                      {categories
                        .filter(c => {
                          const query = searchCatQuery.toLowerCase().trim();
                          if (!query) return true;
                          return (c.name && c.name.toLowerCase().includes(query)) || (c.group_name && c.group_name.toLowerCase().includes(query));
                        })
                        .map((cat, idx) => {
                          const isEditing = editingCatId === cat.id;

                          if (isEditing) {
                            return (
                              <div 
                                key={cat.id || idx}
                                style={{
                                  background: 'var(--bg-body)', 
                                  border: '1.5px solid var(--zoho-blue)',
                                  borderRadius: 'var(--radius-sm)', 
                                  padding: '12px 14px',
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '8px',
                                  boxShadow: '0 2px 8px rgba(2, 101, 220, 0.15)'
                                }}
                              >
                                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--zoho-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <i className="fa-solid fa-pen-to-square"></i> Editing Category #{cat.id}
                                </div>
                                
                                <div className="form-group" style={{ margin: 0 }}>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    placeholder="Category Name *"
                                    value={editCatName}
                                    onChange={(e) => setEditCatName(e.target.value)}
                                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                    autoFocus
                                  />
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    placeholder="Department Group / Wing (e.g. BPAMS / Technical)"
                                    value={editCatGroup}
                                    onChange={(e) => setEditCatGroup(e.target.value)}
                                    style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                                  <button 
                                    type="button" 
                                    className="btn btn-zoho-secondary btn-xs"
                                    onClick={handleCancelEditCategory}
                                    disabled={savingCatEdit}
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="button" 
                                    className="btn btn-zoho-primary btn-xs"
                                    onClick={() => handleSaveEditCategory(cat.id)}
                                    disabled={savingCatEdit}
                                    style={{ background: '#0D9488', borderColor: '#0F766E', fontWeight: 700 }}
                                  >
                                    {savingCatEdit ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Save
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={cat.id || idx}
                              style={{
                                background: 'var(--bg-body)', 
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)', 
                                padding: '10px 14px',
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                gap: '10px',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: '#4338CA' }}>#{cat.id}</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                                </div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>Group: <strong>{cat.group_name || 'General Support'}</strong></span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {/* Edit Button */}
                                <button 
                                  type="button"
                                  className="btn btn-xs"
                                  onClick={() => handleStartEditCategory(cat)}
                                  title={`Edit Category "${cat.name}"`}
                                  style={{
                                    background: '#0D9488',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '5px',
                                    padding: '3px 9px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 3px rgba(13, 148, 136, 0.25)'
                                  }}
                                >
                                  <i className="fa-solid fa-pen-to-square"></i> Edit
                                </button>

                                {/* Delete Button */}
                                <button 
                                  type="button"
                                  className="btn btn-xs"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  title={`Delete Category "${cat.name}"`}
                                  style={{
                                    background: '#EF4444',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '5px',
                                    padding: '3px 9px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.25)'
                                  }}
                                >
                                  <i className="fa-solid fa-trash-can"></i> Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Soft-Deleted Users Directory & Restoration */}
            {mainNavTab === 'deleted' && (
              <div className="admin-content-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-user-slash" style={{ color: '#EF4444' }}></i> Archived & Inactive User Directory
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Deactivated user records. All associated historical service tickets and audit trail remarks remain preserved in the system.
                    </span>
                  </div>
                </div>

                <div className="zoho-table-card" style={{ overflowX: 'auto', width: '100%' }}>
                  <table className="zoho-table" style={{ width: '100%', minWidth: '760px' }}>
                    <thead>
                      <tr>
                        <th>User / Specialist Name</th>
                        <th>Former Role</th>
                        <th>Login Email ID</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedUsersList.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-folder-open fa-2x" style={{ color: '#94A3B8', marginBottom: '8px', display: 'block' }}></i>
                            No deleted user accounts found. All registered accounts are currently active.
                          </td>
                        </tr>
                      ) : (
                        deletedUsersList.map(item => (
                          <tr key={item.id}>
                            <td>
                              <div className="zoho-tech-cell">
                                <div className="zoho-tech-avatar" style={{ background: '#64748B' }}>
                                  {item.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <strong style={{ display: 'block', fontSize: '0.84rem' }}>{item.name}</strong>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>User ID: #{item.id}</span>
                                </div>
                              </div>
                            </td>

                            <td>{getRoleBadgeUI(item.role)}</td>

                            <td><code style={{ fontSize: '0.78rem' }}>{item.email}</code></td>

                            <td>
                              <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                                <i className="fa-solid fa-user-xmark"></i> Soft-Deleted / Inactive
                              </span>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <button 
                                className="btn btn-zoho-primary btn-xs"
                                onClick={() => handleActivateUser(item.id, item.name)}
                                style={{ background: '#10B981', borderColor: '#059669', fontWeight: 700 }}
                                title="Reactivate User Account to Active Directory"
                              >
                                <i className="fa-solid fa-user-check"></i> Activate
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* DEDICATED CATEGORY SELECTION POPUP MODAL */}
      {categoryPopup.isOpen && (
        <div className="category-popup-overlay">
          <div className="category-popup-card">
            {/* Popup Header */}
            <div style={{ background: '#0265DC', color: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-layer-group"></i> Select Department Categories
                </h3>
                <span style={{ fontSize: '0.76rem', color: '#DBEAFE', display: 'block', marginTop: '2px' }}>
                  {categoryPopup.targetUser ? (
                    <>Allocating for Technician User: <strong>{categoryPopup.targetUser.name}</strong> ({categoryPopup.targetUser.email})</>
                  ) : (
                    <>Selecting categories for new Technician User ID</>
                  )}
                </span>
              </div>
              <button 
                className="zoho-modal-close" 
                style={{ color: '#FFFFFF' }} 
                onClick={() => setCategoryPopup(prev => ({ ...prev, isOpen: false }))}
              >
                &times;
              </button>
            </div>

            {/* Popup Action Toolbar (Search & Quick Selection) */}
            <div style={{ padding: '12px 20px', background: 'var(--bg-body)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.78rem' }}></i>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Filter categories by name..." 
                  value={categoryPopup.search}
                  onChange={(e) => setCategoryPopup(prev => ({ ...prev, search: e.target.value }))}
                  style={{ paddingLeft: '30px', fontSize: '0.78rem', height: '32px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-zoho-secondary btn-xs"
                  onClick={handlePopupSelectAll}
                >
                  <i className="fa-solid fa-square-check"></i> Select All
                </button>
                <button 
                  type="button" 
                  className="btn btn-zoho-secondary btn-xs"
                  onClick={handlePopupClearAll}
                >
                  <i className="fa-solid fa-square"></i> Clear All
                </button>
              </div>
            </div>

            {/* Category Grid List */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', maxHeight: '420px' }}>
              {categories
                .filter(cat => !categoryPopup.search || cat.name.toLowerCase().includes(categoryPopup.search.toLowerCase()))
                .map(cat => {
                  const isSelected = categoryPopup.tempSelectedCatIds.includes(cat.id);
                  return (
                    <div 
                      key={cat.id} 
                      className={`category-card-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => togglePopupCatSelection(cat.id)}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => {}} // Handled by container click
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '0.82rem', color: isSelected ? '#0265DC' : 'var(--text-main)', display: 'block' }}>
                          {cat.name}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          ID: #{cat.id} • SLA: 24-48 hrs
                        </span>
                      </div>
                      {isSelected && (
                        <i className="fa-solid fa-circle-check" style={{ color: '#0265DC', fontSize: '1rem' }}></i>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Popup Footer */}
            <div style={{ padding: '14px 20px', background: 'var(--bg-body)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong>{categoryPopup.tempSelectedCatIds.length}</strong> of <strong>{categories.length}</strong> categories selected
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-zoho-secondary btn-sm"
                  onClick={() => setCategoryPopup(prev => ({ ...prev, isOpen: false }))}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-zoho-primary btn-sm"
                  onClick={handleSaveCategoryPopup}
                  disabled={categoryPopup.saving}
                >
                  {categoryPopup.saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Apply & Save Categories
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED EDIT USER ACCOUNT & PERMISSIONS MODAL */}
      {editUserModal.isOpen && (
        <div className="category-popup-overlay" style={{ zIndex: 1200 }}>
          <div className="category-popup-card" style={{ maxWidth: '720px', maxHeight: '90vh' }}>
            {/* Modal Header */}
            <div style={{ background: '#0D9488', color: '#FFFFFF', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 10px', borderRadius: '8px', fontSize: '1.2rem' }}>
                  <i className="fa-solid fa-user-pen"></i>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>
                    Edit User Account Details & Category Allocations
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.85)', display: 'block', marginTop: '2px' }}>
                    Modifying Account: <strong>{editUserModal.user?.name}</strong> (User ID #{editUserModal.user?.id})
                  </span>
                </div>
              </div>
              <button 
                className="zoho-modal-close" 
                style={{ color: '#FFFFFF' }} 
                onClick={() => setEditUserModal(prev => ({ ...prev, isOpen: false }))}
              >
                &times;
              </button>
            </div>

            {/* Modal Form Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: 'var(--modal-bg)' }}>
              {editUserModal.error && (
                <div style={{ background: '#FEE2E2', border: '1px solid #F87171', color: '#B91C1C', padding: '10px 14px', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{editUserModal.error}</span>
                </div>
              )}

              <form onSubmit={handleSaveEditUser}>
                <div className="form-grid-2">
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Full Name / Username *
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Suresh Kumar"
                      required
                      value={editUserModal.name}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Account Role *
                    </label>
                    <select 
                      className="form-control"
                      value={editUserModal.role}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, role: e.target.value }))}
                    >
                      {rolesList.length > 0 ? (
                        rolesList.map(r => (
                          <option key={r.id || r.role_key} value={r.role_key}>
                            {r.role_key === 'admin' ? '👑 ' : r.role_key === 'universal' ? '🌐 ' : r.role_key === 'technician' ? '🛠️ ' : r.role_key === 'user' ? '👤 ' : '⚡ '}
                            {r.role_name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="technician">🛠️ Technician Specialist</option>
                          <option value="universal">🌐 Universal Operator</option>
                          <option value="user">👤 Citizen User</option>
                          <option value="admin">👑 Administrator</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Login Email ID *
                    </label>
                    <input 
                      type="email" 
                      className="form-control" 
                      placeholder="e.g. user@townplanning.gov.in"
                      required
                      value={editUserModal.email}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      <span>Password</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
                          let pass = '';
                          for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                          setEditUserModal(prev => ({ ...prev, password: pass }));
                        }}
                        style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.74rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 700 }}
                      >
                        Generate Random
                      </button>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={editUserModal.showPassword ? 'text' : 'password'} 
                        className="form-control" 
                        placeholder="Set account password..."
                        value={editUserModal.password}
                        onChange={(e) => setEditUserModal(prev => ({ ...prev, password: e.target.value }))}
                        style={{ paddingRight: '36px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setEditUserModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}
                        title={editUserModal.showPassword ? 'Hide Password' : 'Show Password'}
                      >
                        <i className={`fa-solid ${editUserModal.showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Phone / Contact Number (Optional)
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. +91 9876543210"
                      value={editUserModal.phone}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Department Designation / Wing (Optional)
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Senior Town Planner"
                      value={editUserModal.designation}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, designation: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Assigned Categories Section */}
                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-layer-group" style={{ color: '#0D9488' }}></i> Assigned Department Categories
                      </strong>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {editUserModal.category_ids.length} of {categories.length} categories allocated
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn btn-zoho-secondary btn-xs"
                        onClick={() => setEditUserModal(prev => ({ ...prev, category_ids: categories.map(c => c.id) }))}
                      >
                        <i className="fa-solid fa-square-check"></i> Select All
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-zoho-secondary btn-xs"
                        onClick={() => setEditUserModal(prev => ({ ...prev, category_ids: [] }))}
                      >
                        <i className="fa-solid fa-square"></i> Clear All
                      </button>
                    </div>
                  </div>

                  {/* Category Search Filter */}
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem' }}></i>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Filter categories by name..."
                      value={editUserModal.searchCategory}
                      onChange={(e) => setEditUserModal(prev => ({ ...prev, searchCategory: e.target.value }))}
                      style={{ paddingLeft: '28px', fontSize: '0.78rem', height: '30px' }}
                    />
                  </div>

                  {/* Category Checklist Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {categories
                      .filter(c => !editUserModal.searchCategory || c.name.toLowerCase().includes(editUserModal.searchCategory.toLowerCase()))
                      .map(cat => {
                        const isChecked = editUserModal.category_ids.includes(cat.id);
                        return (
                          <div 
                            key={cat.id}
                            onClick={() => {
                              setEditUserModal(prev => {
                                const exists = prev.category_ids.includes(cat.id);
                                const updated = exists ? prev.category_ids.filter(id => id !== cat.id) : [...prev.category_ids, cat.id];
                                return { ...prev, category_ids: updated };
                              });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: `1px solid ${isChecked ? '#0D9488' : 'var(--border-color)'}`,
                              background: isChecked ? 'rgba(13, 148, 136, 0.08)' : 'var(--bg-body)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => {}} 
                              style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isChecked ? '#0D9488' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cat.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                #{cat.id} • {cat.group_name || 'General Support'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button 
                    type="button" 
                    className="btn btn-zoho-secondary"
                    onClick={() => setEditUserModal(prev => ({ ...prev, isOpen: false }))}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-zoho-primary"
                    disabled={editUserModal.saving}
                    style={{ background: '#0D9488', borderColor: '#0F766E', padding: '8px 24px', fontWeight: 700 }}
                  >
                    {editUserModal.saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>} Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
