import React from 'react';
import { Text } from 'react-native';

const Icon = (props: { name?: string; testID?: string }) => (
  <Text testID={props.testID}>{props.name}</Text>
);

export const Ionicons = Object.assign(Icon, { glyphMap: {} });
export const MaterialIcons = Icon;
export default { Ionicons, MaterialIcons };
