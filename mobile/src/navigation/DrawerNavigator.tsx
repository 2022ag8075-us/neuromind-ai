import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";

import ChatScreen from "../screens/ChatScreen";
import MoodScreen from "../screens/MoodScreen";
import CustomDrawer from "./CustomDrawer";

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: "#0f172a",
          width: 260,
        },
      }}
      drawerContent={(props) => <CustomDrawer {...props} />}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
      <Drawer.Screen name="Mood" component={MoodScreen} />
    </Drawer.Navigator>
  );
}