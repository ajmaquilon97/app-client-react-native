import React, { useCallback, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { makeStyles, useTheme } from '@/shared/theme';
import { SearchIcon, CloseCircleIcon } from '@/shared/ui/icons';

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
  const styles = useStyles();
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const handleClear = useCallback(() => {
    onChangeText('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChangeText, onClear]);

  return (
    <View style={styles.container} pointerEvents={pointerEvents}>
      <View style={styles.iconWrapper}>
        <SearchIcon size={18} color={colors.headerTextMuted} />
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.headerTextSubtle}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        selectionColor={colors.accent}
        editable={editable}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          activeOpacity={0.8}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <CloseCircleIcon size={18} color={colors.headerTextSubtle} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// El buscador vive sobre la cabecera de marca (fondo azul oscuro en ambos temas),
// por eso usa los tokens `header*` y no los de superficie normal.
const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.overlayWhite,
    borderRadius: t.radius.xl,
    paddingHorizontal: t.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? t.spacing.sm : t.spacing.xs,
    borderWidth: 1,
    borderColor: t.colors.overlayWhiteSubtle,
  },
  iconWrapper: {
    marginRight: t.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: t.fontSize.base,
    color: t.colors.headerText,
    fontWeight: t.fontWeight.medium,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
  },
  clearButton: {
    marginLeft: t.spacing.xs,
  },
}));

export default React.memo(SearchBar);
