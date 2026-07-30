import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { FontSize, FontWeight, LineHeight } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/spacing';
import { ArrowLeftIcon } from '@/components/icons';

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
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}>
          <ArrowLeftIcon size={20} color={Colors.primaryDark} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerVersion}>{versionLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
  },
  headerVersion: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  headingText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.primaryDark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    lineHeight: FontSize.base * LineHeight.tight,
  },
  bodyText: {
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    lineHeight: FontSize.base * LineHeight.relaxed,
    marginBottom: Spacing.sm,
  },
});
