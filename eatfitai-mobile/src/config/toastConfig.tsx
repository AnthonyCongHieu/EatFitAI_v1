import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ToastConfig, BaseToastProps } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../components/ThemedText';

const C = {
  primary: '#4be277',
  surfaceHigh: 'rgba(37, 41, 58, 0.95)',
  outline: 'rgba(255,255,255,0.1)',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const CustomToast = ({
  text1,
  text2,
  iconName,
  iconColor,
}: BaseToastProps & { iconName: string; iconColor: string }) => (
  <View style={styles.container}>
    <View style={[styles.iconWrap, { backgroundColor: `${iconColor}25` }]}>
      <Ionicons name={iconName as any} size={22} color={iconColor} />
    </View>
    <View style={styles.textWrap}>
      {text1 ? (
        <ThemedText weight="700" style={{ fontSize: 15, marginBottom: 2 }}>
          {text1}
        </ThemedText>
      ) : null}
      {text2 ? (
        <ThemedText color="textSecondary" style={{ fontSize: 13 }}>
          {text2}
        </ThemedText>
      ) : null}
    </View>
  </View>
);

export const toastConfig: ToastConfig = {
  success: (props) => (
    <CustomToast {...props} iconName="checkmark-circle" iconColor={C.primary} />
  ),
  error: (props) => (
    <CustomToast {...props} iconName="alert-circle" iconColor={C.danger} />
  ),
  info: (props) => (
    <CustomToast {...props} iconName="information-circle" iconColor={C.info} />
  ),
  warning: (props) => (
    <CustomToast {...props} iconName="warning" iconColor={C.warning} />
  ),
  achievement: (props) => (
    <CustomToast {...props} iconName="trophy" iconColor="#fbbf24" />
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceHigh,
    width: '92%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
