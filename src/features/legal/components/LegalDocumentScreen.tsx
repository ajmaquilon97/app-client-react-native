import React from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from '@/shared/ui/icons';
import { makeStyles, spacing, useTheme } from '@/shared/theme';

const HEADING_REGEX = /^\d+(\.\d+)*\.?\s+\S/;

interface LegalDocumentScreenProps {
  title: string;
  versionLabel: string;
  content: string;
}

export default function LegalDocumentScreen({
  title,
  versionLabel,
  content,
}: LegalDocumentScreenProps) {
  const styles = useStyles();
  const { colors, statusBarStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={colors.background} />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}>
          <ArrowLeftIcon size={20} color={colors.primaryText} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerVersion}>{versionLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}>
        {paragraphs.map((paragraph, index) => {
          const isHeading = HEADING_REGEX.test(paragraph);
          return (
            <Text
              key={index}
              style={isHeading ? styles.headingText : styles.bodyText}>
              {paragraph}
            </Text>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: t.fontSize.lg,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
  },
  headerVersion: {
    fontSize: t.fontSize.xs,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: t.spacing.lg,
  },
  headingText: {
    fontSize: t.fontSize.base,
    fontWeight: t.fontWeight.bold,
    color: t.colors.primaryText,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.xs,
    lineHeight: t.fontSize.base * t.lineHeight.tight,
  },
  bodyText: {
    fontSize: t.fontSize.base,
    color: t.colors.textPrimary,
    lineHeight: t.fontSize.base * t.lineHeight.relaxed,
    marginBottom: t.spacing.sm,
  },
}));
