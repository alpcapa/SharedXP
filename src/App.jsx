import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import HowItWorksPage from "./pages/HowItWorksPage";
import HostPage from "./pages/HostPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import MyProfilePage from "./pages/MyProfilePage";
import ProfilePage from "./pages/ProfilePage";
import SignUpPage from "./pages/SignUpPage";

const USER_STORAGE_KEY = "sharedxp-users";
const SESSION_STORAGE_KEY = "sharedxp-session";

const getStoredUsers = () => {
  try {
    const rawUsers = localStorage.getItem(USER_STORAGE_KEY);
    if (!rawUsers) {
      return [];
    }

    const parsedUsers = JSON.parse(rawUsers);
    return Array.isArray(parsedUsers) ? parsedUsers : [];
  } catch (error) {
    return [];
  }
};

const getStoredSession = () => {
  try {
    const rawUser = localStorage.getItem(SESSION_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    return null;
  }
};

function App() {
  const [registeredUsers, setRegisteredUsers] = useState(getStoredUsers);
  const [currentUser, setCurrentUser] = useState(getStoredSession);

  useEffect(() => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (!currentUser) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
  }, [currentUser]);

  const authActions = useMemo(
    () => ({
      currentUser,
      onLogout: () => setCurrentUser(null),
      onEmailSignUp: (newUser) => {
        const normalizedEmail = newUser.email.trim().toLowerCase();
        const userToSave = {
          ...newUser,
          email: normalizedEmail,
          isHost: false,
          history: newUser.history ?? []
        };

        setRegisteredUsers((previousUsers) => {
          const usersWithoutCurrentEmail = previousUsers.filter(
            (user) => user.email.toLowerCase() !== normalizedEmail
          );
          return [...usersWithoutCurrentEmail, userToSave];
        });

        setCurrentUser(userToSave);
      },
      onEmailLogin: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const matchedUser = registeredUsers.find(
          (user) =>
            user.email.toLowerCase() === normalizedEmail &&
            user.password === password
        );

        if (!matchedUser) {
          return {
            success: false,
            message: "Incorrect email or password."
          };
        }

        setCurrentUser(matchedUser);
        return {
          success: true
        };
      },
      onSocialLogin: (provider) => {
        const providerName = provider === "apple" ? "Apple" : "Google";
        const providerEmail = `${providerName.toLowerCase()}@sharedxp.app`;
        const existingProviderUser = registeredUsers.find(
          (user) => user.email.toLowerCase() === providerEmail
        );

        if (existingProviderUser) {
          setCurrentUser(existingProviderUser);
          return;
        }

        const createdProviderUser = {
          fullName: `${providerName} Traveler`,
          email: providerEmail,
          password: "",
          phone: "",
          address: "",
          photo:
            providerName === "Apple"
              ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&h=300&q=80"
              : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&h=300&q=80",
          isHost: false,
          history: []
        };

        setRegisteredUsers((previousUsers) => [...previousUsers, createdProviderUser]);
        setCurrentUser(createdProviderUser);
      },
      onToggleHost: () => {
        if (!currentUser) {
          return;
        }

        const updatedUser = {
          ...currentUser,
          isHost: true
        };

        setCurrentUser(updatedUser);
        setRegisteredUsers((previousUsers) =>
          previousUsers.map((user) =>
            user.email.toLowerCase() === currentUser.email.toLowerCase()
              ? updatedUser
              : user
          )
        );
      }
    }),
    [currentUser, registeredUsers]
  );

  return (
    <Routes>
      <Route path="/" element={<HomePage {...authActions} />} />
      <Route path="/locals" element={<HomePage {...authActions} />} />
      <Route path="/how-it-works" element={<HowItWorksPage {...authActions} />} />
      <Route path="/buddy/:buddyId" element={<ProfilePage {...authActions} />} />
      <Route path="/signup" element={<SignUpPage {...authActions} />} />
      <Route path="/login" element={<LoginPage {...authActions} />} />
      <Route path="/my-profile" element={<MyProfilePage {...authActions} />} />
      <Route path="/become-a-host" element={<HostPage {...authActions} />} />
      <Route path="/host-settings" element={<HostPage {...authActions} />} />
      <Route path="/history" element={<HistoryPage {...authActions} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
