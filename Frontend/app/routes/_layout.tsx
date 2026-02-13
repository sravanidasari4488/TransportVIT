import { Stack } from "expo-router";
import { useLocalSearchParams } from 'expo-router';

function RouteLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTintColor: "#3366FF",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerShadowVisible: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="[routeId]"
        options={({ route }) => ({
          title: `Route ${route?.params?.routeId?.toUpperCase() || "Route"}`,
          headerBackTitle: "Routes",
        })}
      />
    </Stack>
  );
}

export default RouteLayout;
