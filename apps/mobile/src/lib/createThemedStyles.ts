import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import type { ThemeColors } from '@expensetracker/shared';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export const createThemedStyles = <T extends NamedStyles<T>>(
  stylesFn: (colors: ThemeColors) => T
) => {
  return (colors: ThemeColors): T => {
    return StyleSheet.create(stylesFn(colors));
  };
};
