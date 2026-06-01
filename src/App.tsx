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
  const [isAdminPortal, setIsAdminPortal] = useState(false);
  const [isUserPortal, setIsUserPortal] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [safetyTab, setSafetyTab] = useState<'public_privacy' | 'public_terms'>('public_privacy');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error('Global Error caught:', e.error);
      setError(`เกิดข้อผิดพลาด: ${e.error?.message || 'ไม่ทราบสาเหตุ'}`);
    };
    window.addEventListener('error', handleError);

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
        // Clear stale local session items if we encounter a refresh token error
        if (
          error.message.includes('Refresh Token') || 
          error.message.includes('refresh_token_not_found') || 
          error.message.includes('invalid_grant')
        ) {
          localStorage.removeItem('sangkha_handover_local_user');
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
          supabase.auth.signOut().catch(() => {});
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
      setLoading(false);
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
        if (data.role === 'admin') {
          setIsAdmin(true);
          setIsAdminPortal(true);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setLocalUserProfile(null);
    localStorage.removeItem('sangkha_handover_local_user');
    setIsAdminPortal(false);
    setIsUserPortal(false);
    setIsAdmin(false);
  };

  const urlParams = new URLSearchParams(window.location.search);
  const currentView = urlParams.get('view') || '';
  const isLiff = 
    currentView === 'liff' || 
    window.location.pathname === '/liff' || 
    window.location.pathname.endsWith('/liff') || 
    window.location.pathname.endsWith('/liff/');

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

