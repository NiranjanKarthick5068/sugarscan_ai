import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Home, History, Scan, Brain, User } from 'lucide-react-native';
import { useLiveUpdates } from '../../../hooks/useLiveUpdates';
import { COLORS, RADII, SHADOWS } from '../../../theme/tokens';

const TAB_ICON_SIZE = 22;
const SCAN_ICON_SIZE = 26;

export default function TabLayout() {
  useLiveUpdates();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <View style={[StyleSheet.absoluteFill, styles.tabBarBg]} />
          ),
          tabBarActiveTintColor:   COLORS.lime,
          tabBarInactiveTintColor: COLORS.textOnLightFaint,
          tabBarShowLabel: true,
          tabBarLabelStyle: styles.tabBarLabel,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home size={TAB_ICON_SIZE} color={color} strokeWidth={2} />,
          }}
        />

        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color }) => <History size={TAB_ICON_SIZE} color={color} strokeWidth={2} />,
          }}
        />

        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ focused }) => (
              <View style={[styles.scanButton, focused && styles.scanButtonActive]}>
                <Scan size={SCAN_ICON_SIZE} color={focused ? COLORS.textOnLime : COLORS.textOnLightSoft} strokeWidth={2} />
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />

        <Tabs.Screen
          name="chat"
          options={{
            title: 'AI Twin',
            tabBarIcon: ({ color }) => <Brain size={TAB_ICON_SIZE} color={color} strokeWidth={2} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <User size={TAB_ICON_SIZE} color={color} strokeWidth={2} />,
          }}
        />
      </Tabs>

    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,26,26,0.08)',
    elevation: 0,
    backgroundColor: 'rgba(255,255,255,0.92)',
    height: 90,
    paddingBottom: 30,
    paddingTop: 10,
  },
  tabBarBg: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: RADII.avatar,
    backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  scanButtonActive: {
    backgroundColor: COLORS.lime,
    borderColor: COLORS.lime,
    ...SHADOWS.limeButtonGlow,
  },
});
