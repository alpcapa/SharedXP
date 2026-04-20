import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import HowItWorksPage from "./pages/HowItWorksPage";
import HostPage from "./pages/HostPage";
import HistoryPage from "./pages/HistoryPage";
import FollowPage from "./pages/FollowPage";
import HelpPage from "./pages/HelpPage";
import LoginPage from "./pages/LoginPage";
import MyProfilePage from "./pages/MyProfilePage";
import ProfilePage from "./pages/ProfilePage";
import SignUpPage from "./pages/SignUpPage";
import ContentAndIntellectualPropertyPolicyPage from "./pages/ContentAndIntellectualPropertyPolicyPage";
import DisclaimersPage from "./pages/DisclaimersPage";
import LegalPage from "./pages/LegalPage";
import PaymentsAndPayoutTermsPage from "./pages/PaymentsAndPayoutTermsPage";
import PrivacyNoticePage from "./pages/PrivacyNoticePage";
import SafetyAndRiskPolicyPage from "./pages/SafetyAndRiskPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";

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

const inferCityFromAddress = (address) => {
  if (!address) {
    return "";
  }

  const addressParts = address
    .split(",")
    .map((addressPart) => addressPart.trim())
    .filter(Boolean);

  if (addressParts.length >= 2) {
    return addressParts[1];
  }

  return addressParts[0] ?? "";
};

const normalizeLanguages = (languages) =>
  Array.from({ length: 4 }, (_, index) =>
    typeof languages?.[index] === "string" ? languages[index].trim() : ""
  );
const normalizeSports = (sports) =>
  Array.from({ length: 4 }, (_, index) =>
    typeof sports?.[index] === "string" ? sports[index].trim() : ""
  );

const hashPassword = async (rawPassword) => {
  const encodedPassword = new TextEncoder().encode(rawPassword);
  const digestBuffer = await crypto.subtle.digest("SHA-256", encodedPassword);
  return Array.from(new Uint8Array(digestBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

function App() {
  const [registeredUsers, setRegisteredUsers] = useState(getStoredUsers);
  const [currentUser, setCurrentUser] = useState(getStoredSession);

  useEffect(() => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    const hasLegacyPasswords = registeredUsers.some(
      (user) => Boolean(user.password) && !user.passwordHash
    );

    if (!hasLegacyPasswords) {
      return;
    }

    const migrateLegacyPasswords = async () => {
      const migratedUsers = await Promise.all(
        registeredUsers.map(async (user) => {
          if (!user.password || user.passwordHash) {
            return user;
          }

          const passwordHash = await hashPassword(user.password);
          const { password, ...migratedUser } = { ...user, passwordHash };
          return migratedUser;
        })
      );

      setRegisteredUsers(migratedUsers);
      setCurrentUser((activeUser) => {
        if (!activeUser) {
          return activeUser;
        }

        return (
          migratedUsers.find(
            (user) => user.email.toLowerCase() === activeUser.email.toLowerCase()
          ) ?? activeUser
        );
      });
    };

    migrateLegacyPasswords();
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
      onEmailSignUp: async (newUser) => {
        const normalizedEmail = newUser.email.trim().toLowerCase();
        const passwordHash = await hashPassword(newUser.password);
        const restProfile = { ...newUser };
        delete restProfile.password;
        const userToSave = {
          ...restProfile,
          email: normalizedEmail,
          passwordHash,
          languages: normalizeLanguages(newUser.languages),
          sports: normalizeSports(newUser.sports),
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
      onEmailLogin: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const passwordHash = await hashPassword(password);
        const matchedUser = registeredUsers.find(
          (user) =>
            user.email.toLowerCase() === normalizedEmail &&
            user.passwordHash === passwordHash
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
          passwordHash: "",
          phone: "",
          address: "",
          languages: normalizeLanguages(),
          sports: normalizeSports(),
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
          isHost: true,
          hostProfile: {
            ...(currentUser.hostProfile ?? {}),
            firstName: currentUser.firstName ?? "",
            lastName: currentUser.lastName ?? "",
            fullName: currentUser.fullName ?? "",
            email: currentUser.email ?? "",
            phone: currentUser.phone ?? "",
            address: currentUser.address ?? "",
            country: currentUser.country ?? currentUser.hostProfile?.country ?? "",
            city:
              currentUser.city ??
              currentUser.hostProfile?.city ??
              inferCityFromAddress(currentUser.address),
            photo: currentUser.photo ?? "",
            languages: normalizeLanguages(currentUser.languages)
          }
        };

        setCurrentUser(updatedUser);
        setRegisteredUsers((previousUsers) =>
          previousUsers.map((user) =>
            user.email.toLowerCase() === currentUser.email.toLowerCase()
              ? updatedUser
              : user
          )
        );
      },
      onSaveHostProfile: (hostProfile) => {
        if (!currentUser) {
          return;
        }

        const syncedHostProfile = {
          ...hostProfile,
          firstName: currentUser.firstName ?? "",
          lastName: currentUser.lastName ?? "",
          fullName: currentUser.fullName ?? "",
          email: currentUser.email ?? "",
          phone: currentUser.phone ?? "",
          address: currentUser.address ?? "",
          country: hostProfile.country ?? currentUser.country ?? "",
          city: hostProfile.city ?? currentUser.city ?? inferCityFromAddress(currentUser.address),
          photo: currentUser.photo ?? "",
          languages: normalizeLanguages(currentUser.languages)
        };

        const updatedUser = {
          ...currentUser,
          isHost: true,
          hostProfile: syncedHostProfile
        };

        setCurrentUser(updatedUser);
        setRegisteredUsers((previousUsers) =>
          previousUsers.map((user) =>
            user.email.toLowerCase() === currentUser.email.toLowerCase()
              ? updatedUser
              : user
          )
        );
      },
      onUpdateProfile: async (profileUpdates) => {
        if (!currentUser) {
          return {
            success: false,
            message: "Please log in to update your profile."
          };
        }

        const previousEmail = currentUser.email.trim().toLowerCase();
        const nextEmail = (profileUpdates.email ?? currentUser.email).trim().toLowerCase();
        const nextPhone = (profileUpdates.phone ?? currentUser.phone ?? "").trim();
        const hasCriticalChanges =
          nextEmail !== previousEmail || nextPhone !== (currentUser.phone ?? "").trim();

        const isEmailAlreadyInUse = registeredUsers.some(
          (user) => {
            const normalizedUserEmail = user.email.toLowerCase();
            return normalizedUserEmail === nextEmail && normalizedUserEmail !== previousEmail;
          }
        );
        if (isEmailAlreadyInUse) {
          return {
            success: false,
            message: "This email is already in use by another account."
          };
        }

        const normalizedProfileCity =
          typeof profileUpdates.city === "string" ? profileUpdates.city.trim() : undefined;
        const profileCity =
          normalizedProfileCity !== undefined
            ? normalizedProfileCity
            : inferCityFromAddress(profileUpdates.address);
        const shouldSyncHostProfile = Boolean(currentUser.isHost && currentUser.hostProfile);
        const nextHostProfile = shouldSyncHostProfile
          ? {
              ...currentUser.hostProfile,
              firstName: currentUser.firstName ?? "",
              lastName: currentUser.lastName ?? "",
              fullName: currentUser.fullName ?? "",
              email: nextEmail,
              phone: nextPhone,
              address: profileUpdates.address ?? currentUser.address ?? "",
              photo: profileUpdates.photo ?? currentUser.photo ?? "",
              languages: normalizeLanguages(profileUpdates.languages ?? currentUser.languages),
              sports: normalizeSports(profileUpdates.sports ?? currentUser.sports),
              country: profileUpdates.country ?? currentUser.hostProfile.country,
              city: profileCity !== undefined ? profileCity : currentUser.hostProfile.city ?? "",
              stripe: {
                ...(currentUser.hostProfile.stripe ?? {}),
                stripeEmail: nextEmail
              }
            }
          : currentUser.hostProfile;

        const updatedUser = {
          ...currentUser,
          ...profileUpdates,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          fullName: currentUser.fullName,
          email: nextEmail,
          phone: nextPhone,
          sports: normalizeSports(profileUpdates.sports ?? currentUser.sports),
          hostProfile: nextHostProfile
        };

        setRegisteredUsers((previousUsers) =>
          previousUsers.map((user) =>
            user.email.toLowerCase() === previousEmail
              ? updatedUser
              : user
          )
        );

        if (hasCriticalChanges) {
          setCurrentUser(null);
          return {
            success: true,
            requiresReauthentication: true
          };
        }

        setCurrentUser(updatedUser);
        return {
          success: true,
          requiresReauthentication: false
        };
      },
      onSaveHistory: (historyItems) => {
        if (!currentUser) {
          return;
        }

        const normalizedHistoryItems = Array.isArray(historyItems) ? historyItems : [];
        const normalizedEmail = currentUser.email.toLowerCase();
        const updatedUser = {
          ...currentUser,
          history: normalizedHistoryItems
        };

        setCurrentUser(updatedUser);
        setRegisteredUsers((previousUsers) =>
          previousUsers.map((user) =>
            user.email.toLowerCase() === normalizedEmail
              ? {
                  ...user,
                  history: normalizedHistoryItems
                }
              : user
          )
        );
      },
      onSaveHostHistory: (hostHistoryItems) => {
        if (!currentUser) {
          return;
        }

        const normalizedItems = Array.isArray(hostHistoryItems) ? hostHistoryItems : [];
        const normalizedEmail = currentUser.email.toLowerCase();
        const updatedUser = {
          ...currentUser,
          hostHistory: normalizedItems
        };

        setCurrentUser(updatedUser);
        setRegisteredUsers((previousUsers) =>
          previousUsers.map((user) =>
            user.email.toLowerCase() === normalizedEmail
              ? {
                  ...user,
                  hostHistory: normalizedItems
                }
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
      <Route path="/locals" element={<ExplorePage {...authActions} />} />
      <Route path="/how-it-works" element={<HowItWorksPage {...authActions} />} />
      <Route path="/buddy/:buddyId" element={<ProfilePage {...authActions} />} />
      <Route path="/signup" element={<SignUpPage {...authActions} />} />
      <Route path="/login" element={<LoginPage {...authActions} />} />
      <Route path="/my-profile" element={<MyProfilePage {...authActions} />} />
      <Route path="/become-a-host" element={<HostPage {...authActions} />} />
      <Route path="/host-settings" element={<HostPage {...authActions} />} />
      <Route path="/history" element={<HistoryPage {...authActions} />} />
      <Route path="/follow" element={<FollowPage {...authActions} />} />
      <Route path="/help" element={<HelpPage {...authActions} />} />
      <Route path="/host-history" element={<Navigate to="/history" replace />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditionsPage {...authActions} />} />
      <Route path="/legal" element={<LegalPage {...authActions} />} />
      <Route path="/privacy-notice" element={<PrivacyNoticePage {...authActions} />} />
      <Route
        path="/payments-and-payout-terms"
        element={<PaymentsAndPayoutTermsPage {...authActions} />}
      />
      <Route path="/safety-and-risk-policy" element={<SafetyAndRiskPolicyPage {...authActions} />} />
      <Route
        path="/content-and-intellectual-property-policy"
        element={<ContentAndIntellectualPropertyPolicyPage {...authActions} />}
      />
      <Route path="/disclaimers" element={<DisclaimersPage {...authActions} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
