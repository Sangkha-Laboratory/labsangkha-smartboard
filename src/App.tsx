import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import Hero from './components/Hero';
import HandoverForm from './components/HandoverForm';
import ShiftHistory from './components/ShiftHistory';
import SupportSection from './components/SupportSection';
import Footer from './components/Footer';
import LoginPage from './components/Login';
import AdminLogin from './components/AdminLogin';
import AdminPortal from './components/AdminPortal';
import UserPortal from './components/UserPortal';
import HandoverManual from './components/HandoverManual';
import ContactTeam from './components/ContactTeam';
import SafetyPolicy from './components/SafetyPolicy';
import LineLiffAccept from './components/LineLiffAccept';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [localUserProfile, setLocalUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminPortal, setIsAdminPortal] = useState(() => {
    const val = sessionStorage.getItem('sangkha_view_isAdminPortal');
    if (val !== null) return val === 'true';
    
    // Fallback: If opening a new tab and logged-in, auto-redirect to portal immediately
    const savedLocalUser = localStorage.getItem('sangkha_handover_local_user');
    if (savedLocalUser) {
      try {
        const u = JSON.parse(savedLocalUser);
        return u.role === 'admin';
      } catch {
        return false;
      }
    }
    return false;
  });
  const [isUserPortal, setIsUserPortal] = useState(() => {
    const val = sessionStorage.getItem('sangkha_view_isUserPortal');
    if (val !== null) return val === 'true';

    // Fallback: If opening a new tab and logged-in, auto-redirect to portal immediately
    const savedLocalUser = localStorage.getItem('sangkha_handover_local_user');
    if (savedLocalUser) {
      try {
        const u = JSON.parse(savedLocalUser);
        return u.role !== 'admin';
      } catch {
        return false;
      }
    }
    return false;
  });
  const [showManual, setShowManual] = useState(() => {
    return sessionStorage.getItem('sangkha_view_showManual') === 'true';
  });
  const [showContact, setShowContact] = useState(() => {
    return sessionStorage.getItem('sangkha_view_showContact') === 'true';
  });
  const [showSafety, setShowSafety] = useState(() => {
    return sessionStorage.getItem('sangkha_view_showSafety') === 'true';
  });
  const [safetyTab, setSafetyTab] = useState<'public_privacy' | 'public_terms'>(() => {
    return (sessionStorage.getItem('sangkha_view_safetyTab') as any) || 'public_privacy';
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Centralized safe session cleaning without page reload or signout loop crashes
  const clearAuthSession = () => {
    console.warn('Silently clearing stale user session due to Auth / Refresh Token Error');
    localStorage.removeItem('sangkha_handover_local_user');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase.auth.token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem('sangkha_view_isAdminPortal');
    localStorage.removeItem('sangkha_view_isUserPortal');
    localStorage.removeItem('sangkha_view_showManual');
    localStorage.removeItem('sangkha_view_showContact');
    localStorage.removeItem('sangkha_view_showSafety');
    localStorage.removeItem('sangkha_view_safetyTab');

    sessionStorage.removeItem('sangkha_view_isAdminPortal');
    sessionStorage.removeItem('sangkha_view_isUserPortal');
    sessionStorage.removeItem('sangkha_view_showManual');
    sessionStorage.removeItem('sangkha_view_showContact');
    sessionStorage.removeItem('sangkha_view_showSafety');
    sessionStorage.removeItem('sangkha_view_safetyTab');
    
    // Clear and reset state to logged out / defaults safely
    setUser(null);
    setUserProfile(null);
    setLocalUserProfile(null);
    setIsAdmin(false);
    setIsAdminPortal(false);
    setIsUserPortal(false);
    setLoading(false);
    setError(null);

    // Call local signOut if possible, but run securely to prevent further errors
    try {
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const serializeError = (err: any): string => {
      if (!err) return '';
      if (typeof err === 'string') return err;
      let str = '';
      if (err.message) str += ' ' + err.message;
      if (err.description) str += ' ' + err.description;
      if (err.error_description) str += ' ' + err.error_description;
      if (err.error) {
        if (typeof err.error === 'string') {
          str += ' ' + err.error;
        } else {
          str += ' ' + (err.error.message || err.error.error_description || '');
        }
      }
      try {
        str += ' ' + JSON.stringify(err);
      } catch {
        // ignore
      }
      return str;
    };

    const handleError = (e: ErrorEvent) => {
      const errMsg = serializeError(e.error) || e.message || '';
      
      const isTokenError = 
        errMsg.toLowerCase().includes('refresh token') || 
        errMsg.toLowerCase().includes('refresh_token') || 
        errMsg.toLowerCase().includes('invalid_grant') ||
        errMsg.toLowerCase().includes('token not found') ||
        errMsg.toLowerCase().includes('grant_not_found');

      if (isTokenError) {
        e.preventDefault(); // Prevent crash overlay/console panic
        clearAuthSession();
        return;
      }
      console.error('Global Error caught:', e.error || e.message);
      setError(`เกิดข้อผิดพลาด: ${e.error?.message || e.message || 'ไม่ทราบสาเหตุ'}`);
    };
    window.addEventListener('error', handleError);

    const handleRejection = (e: PromiseRejectionEvent) => {
      const errMsg = serializeError(e.reason);

      const isTokenError = 
        errMsg.toLowerCase().includes('refresh token') || 
        errMsg.toLowerCase().includes('refresh_token') || 
        errMsg.toLowerCase().includes('invalid_grant') ||
        errMsg.toLowerCase().includes('token not found') ||
        errMsg.toLowerCase().includes('grant_not_found');

      if (isTokenError) {
        e.preventDefault(); // Prevent unhandled rejection console panic
        clearAuthSession();
        return;
      }
      console.error('Global Promise Rejection caught:', e.reason);
    };
    window.addEventListener('unhandledrejection', handleRejection);

    const handleOpenTab = (e: Event) => {
      const customEvent = e as CustomEvent<'public_privacy' | 'public_terms'>;
      if (customEvent.detail) {
        setSafetyTab(customEvent.detail);
        setIsAdminPortal(false);
        setIsUserPortal(false);
        setShowManual(false);
        setShowContact(false);
        setShowSafety(true);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };
    window.addEventListener('open-safety-tab', handleOpenTab as EventListener);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('open-safety-tab', handleOpenTab as EventListener);
    };
  }, []);

  useEffect(() => {
    // Safety timeout to prevent infinite loading if Supabase hangs
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Initial session check timed out after 5s');
        setLoading(false);
      }
    }, 5000);

    // Load persistent local profile if any
    const savedLocalUser = localStorage.getItem('sangkha_handover_local_user');
    if (savedLocalUser) {
      try {
        const u = JSON.parse(savedLocalUser);
        setLocalUserProfile(u);
        if (u.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error('Error parsing saved local user:', e);
      }
    }

    // Check initial session safely to avoid crashes on null data
    supabase.auth.getSession().then((res) => {
      const session = res?.data?.session ?? null;
      const error = res?.error ?? null;

      if (error) {
        console.error('Supabase Auth Error:', error.message);
        
        const isTokenErr = 
          error.message.toLowerCase().includes('refresh token') || 
          error.message.toLowerCase().includes('refresh_token') || 
          error.message.toLowerCase().includes('invalid_grant') ||
          error.message.toLowerCase().includes('token not found') ||
          error.message.toLowerCase().includes('grant_not_found');

        if (isTokenErr) {
          clearAuthSession();
          return;
        }
      }

      const u = session?.user ?? null;
      setUser(u);
      
      if (u) {
        fetchUserProfile(u.email!);
      } else {
        setLoading(false);
      }
      clearTimeout(timeout);
    }).catch(err => {
      console.error('getSession catch:', err);
      const errMsg = err?.message || String(err || '');
      
      const isTokenErr = 
        errMsg.toLowerCase().includes('refresh token') || 
        errMsg.toLowerCase().includes('refresh_token') || 
        errMsg.toLowerCase().includes('invalid_grant') ||
        errMsg.toLowerCase().includes('token not found') ||
        errMsg.toLowerCase().includes('grant_not_found');

      if (isTokenErr) {
        clearAuthSession();
      } else {
        setLoading(false);
      }
      clearTimeout(timeout);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchUserProfile(u.email!);
      } else {
        setUserProfile(null);
        setIsAdminPortal(false);
        setIsUserPortal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (!error && data) {
        setUserProfile(data);
        
        // Define if any view is currently set to true in sessionStorage
        const isAnyViewActive = 
          sessionStorage.getItem('sangkha_view_isAdminPortal') === 'true' ||
          sessionStorage.getItem('sangkha_view_isUserPortal') === 'true' ||
          sessionStorage.getItem('sangkha_view_showManual') === 'true' ||
          sessionStorage.getItem('sangkha_view_showContact') === 'true' ||
          sessionStorage.getItem('sangkha_view_showSafety') === 'true';

        if (data.role === 'admin') {
          setIsAdmin(true);
          if (!isAnyViewActive) {
            setIsAdminPortal(true);
          }
        } else {
          setIsAdmin(false);
          if (!isAnyViewActive) {
            setIsUserPortal(true);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const activeUser = userProfile || localUserProfile;

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    sessionStorage.setItem('sangkha_view_isAdminPortal', String(isAdminPortal));
    sessionStorage.setItem('sangkha_view_isUserPortal', String(isUserPortal));
    sessionStorage.setItem('sangkha_view_showManual', String(showManual));
    sessionStorage.setItem('sangkha_view_showContact', String(showContact));
    sessionStorage.setItem('sangkha_view_showSafety', String(showSafety));
    sessionStorage.setItem('sangkha_view_safetyTab', safetyTab);
  }, [isAdminPortal, isUserPortal, showManual, showContact, showSafety, safetyTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setLocalUserProfile(null);
    localStorage.removeItem('sangkha_handover_local_user');
    
    // Clear persistent views on logout
    localStorage.removeItem('sangkha_view_isAdminPortal');
    localStorage.removeItem('sangkha_view_isUserPortal');
    localStorage.removeItem('sangkha_view_showManual');
    localStorage.removeItem('sangkha_view_showContact');
    localStorage.removeItem('sangkha_view_showSafety');
    localStorage.removeItem('sangkha_view_safetyTab');
    localStorage.removeItem('user_portal_active_tab');
    localStorage.removeItem('admin_portal_active_tab');

    sessionStorage.removeItem('sangkha_view_isAdminPortal');
    sessionStorage.removeItem('sangkha_view_isUserPortal');
    sessionStorage.removeItem('sangkha_view_showManual');
    sessionStorage.removeItem('sangkha_view_showContact');
    sessionStorage.removeItem('sangkha_view_showSafety');
    sessionStorage.removeItem('sangkha_view_safetyTab');
    sessionStorage.removeItem('user_portal_active_tab');
    sessionStorage.removeItem('admin_portal_active_tab');

    setIsAdminPortal(false);
    setIsUserPortal(false);
    setShowManual(false);
    setShowContact(false);
    setShowSafety(false);
    setIsAdmin(false);
  };

  const urlParams = new URLSearchParams(window.location.search);
  const currentView = urlParams.get('view') || '';
  
  // Robust LIFF detection (handles direct 'view=liff', pathnames, liff.state redirects, or presence of handover_id/id)
  const isLiff = 
    currentView === 'liff' || 
    window.location.pathname === '/liff' || 
    window.location.pathname.endsWith('/liff') || 
    window.location.pathname.endsWith('/liff/') ||
    urlParams.has('handover_id') ||
    urlParams.has('id') ||
    urlParams.has('liff.state') ||
    window.location.href.includes('liff.state') ||
    window.location.hash.includes('liff.state') ||
    window.location.hash.includes('view=liff') ||
    window.location.hash.includes('handover_id=');

  if (isLiff) {
    return <LineLiffAccept isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-100 max-w-md w-full">
          <h2 className="text-red-600 font-bold text-xl mb-2">ตรวจพบข้อผิดพลาด</h2>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-2 rounded-xl font-bold"
          >
            รีเฟรชหน้าจอ
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAdminPortal && activeUser) {
    return (
      <AdminPortal 
        user={activeUser} 
        onLogout={handleLogout} 
        onSwitchToSite={() => setIsAdminPortal(false)} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  if (isUserPortal && activeUser) {
    return (
      <UserPortal 
        user={activeUser} 
        onLogout={handleLogout} 
        onSwitchToSite={() => setIsUserPortal(false)} 
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  if (showAdminLogin && !activeUser) {
    return <AdminLogin onLoginSuccess={(uProfile) => { 
      setUserProfile(uProfile); 
      setLocalUserProfile(uProfile);
      localStorage.setItem('sangkha_handover_local_user', JSON.stringify(uProfile));
      setIsAdmin(true);
      setIsAdminPortal(true);
      // user will be set by the listener if supabase is used
    }} onBack={() => setShowAdminLogin(false)} />;
  }

  if (showLogin && !activeUser) {
    return <LoginPage 
      onLoginSuccess={(u) => { 
        setShowLogin(false); 
        setLocalUserProfile(u);
        localStorage.setItem('sangkha_handover_local_user', JSON.stringify(u));
        if (u.role === 'admin') {
          setIsAdmin(true);
          setIsAdminPortal(true);
        } else {
          setIsUserPortal(true);
        }
      }} 
      onBack={() => setShowLogin(false)} 
      onAdminClick={() => { setShowLogin(false); setShowAdminLogin(true); }}
    />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] grid grid-rows-[1fr_auto] thai-font transition-colors duration-300 relative overflow-x-hidden">
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full bg-blue-300/5 dark:bg-blue-600/10 blur-[130px] animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/5 dark:bg-indigo-600/10 blur-[130px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 grid grid-rows-[auto_1fr_auto] min-h-screen">
        <Navbar 
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onLoginClick={() => setShowLogin(true)}
          onLogoutClick={handleLogout}
          onAdminPortalClick={() => {
            setIsUserPortal(false);
            setIsAdminPortal(true);
            setShowManual(false);
            setShowContact(false);
            setShowSafety(false);
          }}
          onUserPortalClick={() => {
            setIsAdminPortal(false);
            setIsUserPortal(true);
            setShowManual(false);
            setShowContact(false);
            setShowSafety(false);
          }}
          onManualClick={() => {
            setIsAdminPortal(false);
            setIsUserPortal(false);
            setShowManual(true);
            setShowContact(false);
            setShowSafety(false);
          }}
          isManualActive={showManual}
          onContactClick={() => {
            setIsAdminPortal(false);
            setIsUserPortal(false);
            setShowManual(false);
            setShowContact(true);
            setShowSafety(false);
          }}
          isContactActive={showContact}
          onSafetyClick={() => {
            setSafetyTab('public_privacy');
            setIsAdminPortal(false);
            setIsUserPortal(false);
            setShowManual(false);
            setShowContact(false);
            setShowSafety(true);
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          isSafetyActive={showSafety}
          onHomeClick={() => {
            setIsAdminPortal(false);
            setIsUserPortal(false);
            setShowManual(false);
            setShowContact(false);
            setShowSafety(false);
          }}
          user={activeUser}
          isAdmin={isAdmin}
          isUserPortal={isUserPortal}
          isAdminPortal={isAdminPortal}
        />
        
        <main 
          className="grid grid-rows-[auto_auto_1fr] pb-4 h-full"
          style={{ paddingTop: 'var(--header-height)' }}
        >
          {/* Dynamic Announcement Notification Bar on Navigation Area */}
          <AnnouncementBar />

          {showManual ? (
            <div className="py-2.5">
              <HandoverManual onClose={() => setShowManual(false)} />
            </div>
          ) : showContact ? (
            <div className="py-2.5">
              <ContactTeam onClose={() => setShowContact(false)} />
            </div>
          ) : showSafety ? (
            <div className="py-2.5">
              <SafetyPolicy initialTab={safetyTab} onClose={() => setShowSafety(false)} />
            </div>
          ) : (
            <>
              {/* Row 1: Banner (Hero) */}
              <Hero />
              
              {/* Row 2: Main Content */}
              <div className="w-[92%] max-w-[1280px] mx-auto px-4 mt-6 sm:-mt-[30px] relative z-[1]">
                <div id="handover-section" className="grid grid-cols-1 xl:grid-cols-[35%_1fr] gap-5 xl:items-stretch flex-1 min-h-0">
                  {/* Sidebar Area - Handover Form (Left/Side) */}
                  <div className="flex flex-col">
                    <HandoverForm currentUser={activeUser} />
                  </div>

                  {/* Main Content Area - Shift History (Right/Main) */}
                  <div className="flex flex-col">
                    <ShiftHistory />
                  </div>
                </div>

                 {/* Bottom Support Section (Horizontal) */}
                 <div className="mt-4 sm:mt-6">
                   <SupportSection 
                     vertical={false} 
                     onManualClick={() => setShowManual(true)} 
                     onContactClick={() => setShowContact(true)} 
                     onSafetyClick={() => {
                       setSafetyTab('public_privacy');
                       setIsAdminPortal(false);
                       setIsUserPortal(false);
                       setShowManual(false);
                       setShowContact(false);
                       setShowSafety(true);
                       window.scrollTo({ top: 0, behavior: 'instant' });
                     }} 
                   />
                 </div>
               </div>
             </>
           )}
         </main>
   
         <Footer 
           onPrivacyClick={() => {
             setSafetyTab('public_privacy');
             setIsAdminPortal(false);
             setIsUserPortal(false);
             setShowManual(false);
             setShowContact(false);
             setShowSafety(true);
             window.scrollTo({ top: 0, behavior: 'instant' });
           }}
           onTermsClick={() => {
             setSafetyTab('public_terms');
             setIsAdminPortal(false);
             setIsUserPortal(false);
             setShowManual(false);
             setShowContact(false);
             setShowSafety(true);
             window.scrollTo({ top: 0, behavior: 'instant' });
           }}
         />
      </div>
    </div>
  );
}

