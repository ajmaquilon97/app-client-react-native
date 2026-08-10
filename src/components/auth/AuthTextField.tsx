import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { makeStyles, useTheme } from '@/theme';
import { EyeIcon, EyeOffIcon } from '@/components/icons';

interface AuthTextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export default function AuthTextField({
  label,
  error,
  isPassword = false,
  ...inputProps
}: AuthTextFieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, !!error && styles.inputWrapperError]}>
        <TextInput
          {...inputProps}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor={colors.inputPlaceholder}
          selectionColor={colors.accent}
          style={styles.input}
        />
        {isPassword && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => setShowPassword((prev) => !prev)}>
            {showPassword ? (
              <EyeOffIcon size={20} color={colors.textMuted} />
            ) : (
              <EyeIcon size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    marginBottom: t.spacing.md,
  },
  label: {
    ...t.typography.overline,
    color: t.colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: t.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.inputBackground,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    paddingHorizontal: t.spacing.sm,
  },
  inputWrapperError: {
    borderColor: t.colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: t.spacing.sm,
    ...t.typography.bodySm,
    color: t.colors.textPrimary,
  },
  errorText: {
    ...t.typography.caption,
    color: t.colors.error,
    marginTop: t.spacing.xxs,
  },
}));
