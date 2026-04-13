/**
 * Type declarations for @react-native-community/datetimepicker
 * This resolves the missing module error
 */

declare module '@react-native-community/datetimepicker' {
  import { Component } from 'react';

  export interface DateTimePickerEvent {
    type: 'set' | 'dismissed' | 'neutralButtonPressed';
    nativeEvent: {
      timestamp?: number;
      utcOffset?: number;
    };
  }

  export type AndroidNativeProps = {
    display?: 'default' | 'spinner' | 'calendar' | 'clock';
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    value: Date;
    maximumDate?: Date;
    minimumDate?: Date;
    timeZoneOffsetInMinutes?: number;
    timeZoneOffsetInSeconds?: number;
    locale?: string;
    is24Hour?: boolean;
    positiveButton?: {
      label?: string;
      textColor?: string;
    };
    negativeButton?: {
      label?: string;
      textColor?: string;
    };
    neutralButton?: {
      label?: string;
      textColor?: string;
    };
    minuteInterval?: 1 | 5 | 10 | 15 | 20 | 30;
    mode?: 'date' | 'time' | 'datetime';
    positiveButtonLabel?: string;
    negativeButtonLabel?: string;
    neutralButtonLabel?: string;
    testID?: string;
  };

  export type IOSNativeProps = {
    accentColor?: string;
    display?: 'default' | 'spinner' | 'compact' | 'inline';
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
    value: Date;
    maximumDate?: Date;
    minimumDate?: Date;
    timeZoneOffsetInMinutes?: number;
    locale?: string;
    minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30;
    mode?: 'date' | 'time' | 'datetime' | 'countdown';
    textColor?: string;
    themeVariant?: 'dark' | 'light';
    disabled?: boolean;
    style?: object;
    testID?: string;
  };

  export type DateTimePickerProps = AndroidNativeProps & IOSNativeProps;

  export default class DateTimePicker extends Component<DateTimePickerProps> {}
}
