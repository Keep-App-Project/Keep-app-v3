import React from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PantryStack from './PantryStack';
import ListsStack from './ListsStack';
import RecipesStack from './RecipesStack';
import ReportsStack from './ReportsStack';
import AccountStack from './AccountStack';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();
const BlockedScreen = () => null;

// Barra compacta: só envolve os 5 ícones, com uma pequena margem, e fica centralizada.
const TAB_COUNT = 5;
const TAB_ITEM_WIDTH = 52;
const TAB_BAR_PADDING = 8;
const TAB_BAR_HEIGHT = 46;
const TAB_BAR_WIDTH = TAB_COUNT * TAB_ITEM_WIDTH + TAB_BAR_PADDING * 2;
const ROOT_ROUTES = {
  Pantry: 'PantryHome', Lists: 'ListsHome', Recipes: 'RecipesHome',
  Reports: 'ReportsHome', Account: 'AccountHome',
};

const TAB_ICONS = {
  Pantry: { active: 'basket', inactive: 'basket-outline' },
  Lists: { active: 'list', inactive: 'list-outline' },
  Recipes: { active: 'restaurant', inactive: 'restaurant-outline' },
  Reports: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  Account: { active: 'person', inactive: 'person-outline' },
};

function renderTabIcon(routeName) {
  return ({ focused, color }) => {
    const iconSet = TAB_ICONS[routeName];
    const name = focused ? iconSet.active : iconSet.inactive;
    return <Ionicons name={name} size={22} color={color} />;
  };
}

export default function MainTabs() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sideMargin = Math.max((width - TAB_BAR_WIDTH) / 2, 8);
  const limited = user?.isGuest || user?.plan === 'freemium';
  const paidTabListeners = ({ navigation }) => ({
    tabPress: (event) => {
      if (!limited) return;
      event.preventDefault();
      Alert.alert('Recurso de plano pago', 'Lista de compras, receitas e relatórios estão disponíveis nos planos Keep Casa e Keep Business.', [
        { text: 'Fechar', style: 'cancel' },
        { text: 'Ver planos', onPress: () => navigation.navigate('Account', { screen: 'Plans' }) },
      ]);
    },
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Child screens must not inherit the floating bar: it previously covered
        // forms, modals, the camera preview and the Android navigation area.
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.65)',
        tabBarStyle: getFocusedRouteNameFromRoute(route) &&
          getFocusedRouteNameFromRoute(route) !== ROOT_ROUTES[route.name]
          ? { display: 'none' }
          : {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          borderRadius: TAB_BAR_HEIGHT / 2,
          marginHorizontal: sideMargin,
          marginBottom: Math.max(insets.bottom, 8) + 4,
          height: TAB_BAR_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0, // sem folga extra embaixo: os ícones ficam centralizados na barra
          paddingHorizontal: TAB_BAR_PADDING,
          position: 'absolute',
          elevation: 6,
        },
        tabBarItemStyle: { height: TAB_BAR_HEIGHT, paddingVertical: 0, justifyContent: 'center', alignItems: 'center' },
        tabBarShowLabel: false,
        tabBarIcon: renderTabIcon(route.name),
      })}
    >
      <Tab.Screen name="Pantry" component={PantryStack} />
      <Tab.Screen name="Lists" component={limited ? BlockedScreen : ListsStack} listeners={paidTabListeners} />
      <Tab.Screen name="Recipes" component={limited ? BlockedScreen : RecipesStack} listeners={paidTabListeners} />
      <Tab.Screen name="Reports" component={limited ? BlockedScreen : ReportsStack} listeners={paidTabListeners} />
      <Tab.Screen name="Account" component={AccountStack} />
    </Tab.Navigator>
  );
}
