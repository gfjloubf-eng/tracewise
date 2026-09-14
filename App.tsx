/**
 * TRACEWISE — نقطة الدخول.
 * الملاحة: Splash ← Onboarding ← Tabs (الرئيسية/السجل/مشكلة جديدة/الذاكرة/المزيد)
 * + Stack لتفاصيل المشكلة والفحص والشاشات الفرعية.
 */
import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { StoreProvider, useStore } from './src/state/AppStore';
import { I18nProvider, useI18n } from './src/core/i18n/I18nProvider';
import { getTheme } from './src/core/theme';
import { AppHeader, Screen } from './src/ui/components';

import { SplashScreen } from './src/features/splash/SplashScreen';
import { OnboardingScreen } from './src/features/onboarding/OnboardingScreen';
import { HomeScreen } from './src/features/home/HomeScreen';
import { HistoryScreen } from './src/features/history/HistoryScreen';
import { NewCaseScreen } from './src/features/newcase/NewCaseScreen';
import { MemoryScreen } from './src/features/memory/MemoryScreen';
import { SecurityScreen } from './src/features/security/SecurityScreen';
import { IntegrationsScreen } from './src/features/integrations/IntegrationsScreen';
import { SettingsScreen } from './src/features/settings/SettingsScreen';
import { AboutScreen } from './src/features/about/AboutScreen';
import { ScannerScreen } from './src/features/scanner/ScannerScreen';
import { CaseDetailsScreen } from './src/features/casedetails/CaseDetailsScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  CaseDetails: { caseId: string };
  NewCase: undefined;
  Scanner: { caseId?: string };
  Security: undefined;
  Integrations: undefined;
  Settings: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function TabsNavigator() {
  const { settings } = useStore();
  const dark = settings.darkMode;
  const t = getTheme(dark);
  const { t: tr } = useI18n();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textFaint,
        tabBarStyle: { backgroundColor: t.colors.bgElevated, borderTopColor: t.colors.cardBorder, height: 62 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          title: tr('tab.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      >
        {({ navigation }) => (
          <HomeScreen
            dark={dark}
            onOpenCase={(id) => navigation.navigate('CaseDetails', { caseId: id })}
            onNewCase={() => navigation.navigate('NewCase')}
            onScan={() => navigation.navigate('Scanner', {})}
            onSecurity={() => navigation.navigate('Security')}
            onMemory={() => navigation.navigate('Memory')}
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="History"
        options={{
          title: tr('tab.history'),
          tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" size={size} color={color} />,
        }}
      >
        {({ navigation }) => (
          <HistoryScreen dark={dark} onOpenCase={(id) => navigation.navigate('CaseDetails', { caseId: id })} />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="NewCaseTab"
        options={{
          title: tr('tab.new'),
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 6} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('NewCase');
          },
        })}
      >
        {() => <View />}
      </Tabs.Screen>
      <Tabs.Screen
        name="Memory"
        options={{
          title: tr('tab.memory'),
          tabBarIcon: ({ color, size }) => <Ionicons name="bulb-outline" size={size} color={color} />,
        }}
      >
        {({ navigation }) => (
          <MemoryScreen dark={dark} onOpenCase={(id) => navigation.navigate('CaseDetails', { caseId: id })} />
        )}
      </Tabs.Screen>
      <Tabs.Screen
        name="More"
        options={{
          title: tr('tab.more'),
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
        }}
      >
        {({ navigation }) => <MoreScreen dark={dark} navigation={navigation} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

function MoreScreen({ dark, navigation }: { dark: boolean; navigation: { navigate: (name: keyof RootStackParamList, params?: object) => void } }) {
  const t = getTheme(dark);
  const { t: tr } = useI18n();
  const rows: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; target: keyof RootStackParamList }> = [
    { icon: 'shield-checkmark-outline', label: tr('security.title'), target: 'Security' },
    { icon: 'git-branch-outline', label: tr('integrations.title'), target: 'Integrations' },
    { icon: 'settings-outline', label: tr('settings.title'), target: 'Settings' },
    { icon: 'information-circle-outline', label: tr('about.title'), target: 'About' },
  ];
  return (
    <Screen dark={dark}>
      {rows.map((r) => (
        <View key={r.target}>
          <ScreenRow dark={dark} icon={r.icon} label={r.label} onPress={() => navigation.navigate(r.target, {})} />
        </View>
      ))}
      <View style={{ height: t.spacing(2) }} />
    </Screen>
  );
}

function ScreenRow({
  dark,
  icon,
  label,
  onPress,
}: {
  dark: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const t = getTheme(dark);
  const { Pressable, Text } = require('react-native');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing(3),
        minHeight: 56,
        backgroundColor: t.colors.card,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.cardBorder,
        paddingHorizontal: t.spacing(4),
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={t.colors.accent} />
      <Text style={{ flex: 1, color: t.colors.text, fontSize: t.font.body, fontWeight: '600' }}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={t.colors.textFaint} />
    </Pressable>
  );
}

function SubScreen({
  title,
  dark,
  onBack,
  children,
}: {
  title: string;
  dark: boolean;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: getTheme(dark).colors.bg }}>
      <AppHeader title={title} dark={dark} onBack={onBack} />
      <Screen dark={dark}>{children}</Screen>
    </View>
  );
}

function RootNavigator() {
  const { settings, ready, updateSettings } = useStore();
  const { t: tr } = useI18n();
  const dark = settings.darkMode;
  const t = getTheme(dark);
  const [splashDone, setSplashDone] = useState(false);

  const finishOnboarding = useCallback(() => {
    void updateSettings({ onboarded: true });
  }, [updateSettings]);

  if (!ready || !splashDone) {
    return <SplashScreen dark={dark} onDone={() => setSplashDone(true)} />;
  }

  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme.colors : DefaultTheme.colors),
      background: t.colors.bg,
      card: t.colors.bgElevated,
      text: t.colors.text,
      primary: t.colors.primary,
      border: t.colors.cardBorder,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!settings.onboarded ? (
          <Stack.Screen name="Onboarding" options={{ animation: 'fade' }}>
            {() => <OnboardingScreen dark={dark} onFinish={finishOnboarding} />}
          </Stack.Screen>
        ) : null}
        <Stack.Screen name="Tabs" component={TabsNavigator} />
        <Stack.Screen name="CaseDetails">
          {({ navigation, route }) => (
            <CaseDetailsScreen
              caseId={route.params.caseId}
              dark={dark}
              onBack={() => navigation.goBack()}
              onDeleted={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="NewCase" options={{ presentation: 'modal' }}>
          {({ navigation }) => (
            <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
              <AppHeader title={tr('new.title')} dark={dark} onBack={() => navigation.goBack()} />
              <NewCaseScreen
                dark={dark}
                onCreated={(id) => {
                  navigation.goBack();
                  navigation.navigate('CaseDetails', { caseId: id });
                }}
                onCancel={() => navigation.goBack()}
                onScan={() => navigation.navigate('Scanner', {})}
              />
            </View>
          )}
        </Stack.Screen>
        <Stack.Screen name="Scanner">
          {({ navigation, route }) => (
            <SubScreen title={tr('scanner.title')} dark={dark} onBack={() => navigation.goBack()}>
              <ScannerScreen
                dark={dark}
                initialCaseId={route.params?.caseId}
                onAdded={(caseId) => {
                  navigation.goBack();
                  navigation.navigate('CaseDetails', { caseId });
                }}
              />
            </SubScreen>
          )}
        </Stack.Screen>
        <Stack.Screen name="Security">
          {({ navigation }) => (
            <SubScreen title={tr('security.title')} dark={dark} onBack={() => navigation.goBack()}>
              <SecurityScreen dark={dark} />
            </SubScreen>
          )}
        </Stack.Screen>
        <Stack.Screen name="Integrations">
          {({ navigation }) => (
            <SubScreen title={tr('integrations.title')} dark={dark} onBack={() => navigation.goBack()}>
              <IntegrationsScreen dark={dark} />
            </SubScreen>
          )}
        </Stack.Screen>
        <Stack.Screen name="Settings">
          {({ navigation }) => (
            <SubScreen title={tr('settings.title')} dark={dark} onBack={() => navigation.goBack()}>
              <SettingsScreen dark={dark} />
            </SubScreen>
          )}
        </Stack.Screen>
        <Stack.Screen name="About">
          {({ navigation }) => (
            <SubScreen title={tr('about.title')} dark={dark} onBack={() => navigation.goBack()}>
              <AboutScreen dark={dark} />
            </SubScreen>
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/** مزامنة اللغة: إعدادات التطبيق ← I18nProvider */
function Themed() {
  const { settings } = useStore();
  return (
    <I18nProvider lang={settings.lang}>
      <RootNavigator />
    </I18nProvider>
  );
}

export default function App() {
  useEffect(() => {
    // RTL على الويب
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Themed />
          <StatusBar style="light" />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
