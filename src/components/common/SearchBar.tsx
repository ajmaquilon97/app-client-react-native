import React, { useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInputProps,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { FontSize } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { SearchIcon, CloseCircleIcon } from '@/components/icons';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  editable?: boolean;
  pointerEvents?: 'none' | 'box-none' | 'box-only' | 'auto';
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Buscar canchas, piscinas o salones...',
  onClear,
  editable = true,
  pointerEvents,
}) => {
  const inputRef = useRef<TextInput>(null);

  const handleClear = useCallback(() => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChangeText, onClear]);

  const inputProps: TextInputProps = {
    ref: inputRef,
    value,
    onChangeText,
    placeholder,
    placeholderTextColor: 'rgba(203, 213, 225, 0.8)',
    style: styles.input,
    returnKeyType: 'search',
    autoCorrect: false,
    autoCapitalize: 'none',
    selectionColor: Colors.accentTeal,
  };

  return (
    <View style={styles.container} pointerEvents={pointerEvents}>
      <View style={styles.iconWrapper}>
        <SearchIcon size={18} color={Colors.teal200} />
      </View>
      <TextInput {...inputProps} editable={editable} />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          activeOpacity={0.8}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <CloseCircleIcon size={18} color="rgba(203,213,225,0.8)" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrapper: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.white,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  clearButton: {
    marginLeft: Spacing.xs,
  },
});

export default React.memo(SearchBar);
