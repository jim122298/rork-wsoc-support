import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useMutation } from '@tanstack/react-query';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import {
  Camera,
  ImagePlus,
  X,
  ShieldAlert,
  Send,
  Copy,
  Check,
  TicketPlus,
  Eye,
  ListChecks,
  LifeBuoy,
  AlertTriangle,
  Sparkles,
  RotateCcw,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { BASE_URL } from '@/constants/articles';


const responseSchema = z.object({
  whatImSeeing: z.string(),
  stepByStepFix: z.array(z.string()),
  ifThatDidntWork: z.string(),
  ticketSummary: z.string(),
  sensitiveDataDetected: z.boolean(),
  sensitiveDataWarning: z.string().optional(),
});

type AnalysisResult = z.infer<typeof responseSchema>;

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

function isRetryableError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('please wait') ||
    lower.includes('try again') ||
    lower.includes('temporary') ||
    lower.includes('503') ||
    lower.includes('502') ||
    lower.includes('500') ||
    lower.includes('server error') ||
    lower.includes('unexpected') ||
    lower.includes('json')
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AIProblemSolverScreen() {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const animateResultIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const pickImage = useCallback(async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
      }

      const pickerFn = useCamera
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

      const res = await pickerFn({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: false,
      });

      if (!res.canceled && res.assets[0]) {
        console.log('[AISolver] Image picked:', res.assets[0].uri.substring(0, 60));
        setImageUri(res.assets[0].uri);
        setImageBase64(res.assets[0].base64 ?? null);
        setResult(null);
      }
    } catch (err) {
      console.error('[AISolver] Image pick error:', err);
      Alert.alert('Error', 'Could not access the image. Please try again.');
    }
  }, []);

  const analysisMutation = useMutation({
    mutationFn: async () => {
      if (!imageBase64) throw new Error('No image selected');
      if (!description.trim()) throw new Error('Please describe what issue you are having');

      setErrorBanner(null);
      console.log('[AISolver] Starting AI analysis with retry logic...');

      const contextMsg = [
        `The user took a screenshot of their computer screen and is having an IT issue.`,
        `User's description of the problem: ${description.trim()}`,
        ``,
        `Analyze this screenshot and provide IT troubleshooting guidance.`,
        `In "whatImSeeing", describe what you observe on the screen - the application, any error messages, dialog boxes, or unusual states visible.`,
        `In "stepByStepFix", provide clear numbered steps a non-technical user can follow to resolve the issue.`,
        `In "ifThatDidntWork", provide alternative approaches or escalation advice.`,
        `In "ticketSummary", write a professional copy-paste-ready summary suitable for an IT help desk ticket.`,
        `If you detect any sensitive information (passwords, MFA codes, personal data, client information) in the screenshot, set sensitiveDataDetected to true and describe what was found in sensitiveDataWarning.`,
      ].join('\n');

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = RETRY_DELAYS[attempt - 1] ?? 4000;
            console.log(`[AISolver] Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms...`);
            await sleep(delay);
          }

          console.log(`[AISolver] Attempt ${attempt + 1}/${MAX_RETRIES}`);

          const analysis = await generateObject({
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: contextMsg },
                  { type: 'image', image: imageBase64 },
                ],
              },
            ],
            schema: responseSchema,
          });

          if (!analysis || typeof analysis !== 'object') {
            console.error('[AISolver] Invalid analysis shape:', JSON.stringify(analysis));
            throw new Error('The AI returned an invalid response.');
          }

          if (!analysis.whatImSeeing || !Array.isArray(analysis.stepByStepFix)) {
            console.error('[AISolver] Missing required fields:', JSON.stringify(analysis));
            throw new Error('The AI response was incomplete.');
          }

          console.log('[AISolver] AI analysis complete on attempt', attempt + 1);
          return analysis;
        } catch (sdkError: unknown) {
          const errMsg = sdkError instanceof Error ? sdkError.message : String(sdkError);
          console.error(`[AISolver] Attempt ${attempt + 1} failed:`, errMsg);
          console.error('[AISolver] Raw error object:', JSON.stringify(sdkError, null, 2));

          lastError = sdkError instanceof Error ? sdkError : new Error(errMsg);

          if (attempt < MAX_RETRIES - 1 && isRetryableError(errMsg)) {
            console.log('[AISolver] Error is retryable, will retry...');
            continue;
          }

          if (attempt < MAX_RETRIES - 1) {
            console.log('[AISolver] Non-retryable error, but attempting once more...');
            continue;
          }
        }
      }

      console.error('[AISolver] All retry attempts exhausted. Last error:', lastError?.message);
      throw lastError ?? new Error('AI analysis failed after multiple attempts.');
    },
    retry: false,
    onSuccess: (data) => {
      setErrorBanner(null);
      setResult(data);
      animateResultIn();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      const rawMsg = err instanceof Error ? err.message : String(err);
      console.error('[AISolver] Final analysis error (all retries failed):', rawMsg);
      setErrorBanner("Oops, you're not out of the Woods yet \u2014 an error occurred. Please try again.");
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  const handleAnalyze = useCallback(() => {
    if (!imageBase64) {
      Alert.alert('No Image', 'Please take a photo or upload a screenshot first.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please describe the issue you are having.');
      return;
    }
    Keyboard.dismiss();
    setErrorBanner(null);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    analysisMutation.mutate();
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 350);
  }, [imageBase64, description, analysisMutation]);

  const handleRetry = useCallback(() => {
    setErrorBanner(null);
    Keyboard.dismiss();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    analysisMutation.mutate();
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 350);
  }, [analysisMutation]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result.ticketSummary);
    setCopied(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleCreateTicket = useCallback(async () => {
    await WebBrowser.openBrowserAsync(BASE_URL + '/requests/new');
  }, []);

  const handleClearImage = useCallback(() => {
    setImageUri(null);
    setImageBase64(null);
    setResult(null);
  }, []);

  const handleReset = useCallback(() => {
    setImageUri(null);
    setImageBase64(null);
    setDescription('');
    setResult(null);
    setCopied(false);
  }, []);

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://i.postimg.cc/NM3XxpRx/Woods-Logo-Mobile-2x-1.png' }}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Ask Support Assistant</Text>
          <Text style={styles.headerSubtitle}>
            Snap a screenshot and describe your issue — get instant troubleshooting help
          </Text>
        </View>

        <View style={styles.privacyBanner} testID="privacy-warning">
          <ShieldAlert size={18} color={Colors.warning} />
          <Text style={styles.privacyText}>
            Do not capture passwords, MFA codes, or sensitive client data. Blur or redact any sensitive info before uploading.
          </Text>
        </View>

        {!imageUri ? (
          <View style={styles.uploadSection}>
            <View style={styles.uploadPlaceholder}>
              <View style={styles.uploadIconCircle}>
                <ImagePlus size={32} color={Colors.primary} />
              </View>
              <Text style={styles.uploadTitle}>Upload a Screenshot</Text>
              <Text style={styles.uploadSubtitle}>Take a photo or choose from your gallery</Text>
              <View style={styles.uploadButtons}>
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, pressed && styles.btnPressed]}
                  onPress={() => pickImage(true)}
                  testID="camera-btn"
                >
                  <Camera size={18} color="#FFFFFF" />
                  <Text style={styles.uploadBtnText}>Camera</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.uploadBtn, styles.uploadBtnAlt, pressed && styles.btnPressedAlt]}
                  onPress={() => pickImage(false)}
                  testID="gallery-btn"
                >
                  <ImagePlus size={18} color={Colors.primary} />
                  <Text style={[styles.uploadBtnText, styles.uploadBtnTextAlt]}>Gallery</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.previewSection}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>Screenshot Preview</Text>
              <Pressable onPress={handleClearImage} style={styles.clearBtn} testID="clear-image-btn">
                <X size={16} color={Colors.danger} />
                <Text style={styles.clearBtnText}>Remove</Text>
              </Pressable>
            </View>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="contain"
                testID="preview-image"
              />
            </View>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>
            Describe your issue <Text style={styles.required}>*</Text>
          </Text>

          <TextInput
            style={styles.textInput}
            placeholder="Describe what's happening on your screen..."
            placeholderTextColor={Colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={handleInputFocus}
            testID="description-input"
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.analyzeBtn,
            (!imageBase64 || !description.trim() || analysisMutation.isPending) && styles.analyzeBtnDisabled,
            pressed && imageBase64 && description.trim() && !analysisMutation.isPending && styles.analyzeBtnPressed,
          ]}
          onPress={handleAnalyze}
          disabled={!imageBase64 || !description.trim() || analysisMutation.isPending}
          testID="analyze-btn"
        >
          {analysisMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Sparkles size={18} color="#FFFFFF" />
          )}
          <Text style={styles.analyzeBtnText}>
            {analysisMutation.isPending ? 'Analyzing...' : 'Get AI Help'}
          </Text>
        </Pressable>

        {analysisMutation.isPending && (
          <View style={styles.loadingOverlay}>
            <View style={styles.glowCornerTL} />
            <View style={styles.glowCornerBR} />
            <Image
              source={{ uri: 'https://raw.githubusercontent.com/jim122298/WSOC-App-Assets/main/Gifs/wsoc_affiliates_ai_thinking_loader.gif' }}
              style={styles.loadingGif}
              resizeMode="contain"
            />
            <Text style={styles.loadingText}>AI is analyzing your screenshot…</Text>
            <Text style={styles.loadingSubtext}>this may take a few seconds.</Text>
          </View>
        )}

        {errorBanner && !analysisMutation.isPending && (
          <View style={styles.errorBanner} testID="error-banner">
            <View style={styles.errorBannerIcon}>
              <AlertTriangle size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.errorBannerText}>{errorBanner}</Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
              onPress={handleRetry}
              testID="retry-btn"
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {result && (
          <Animated.View
            style={[
              styles.resultSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {result.sensitiveDataDetected && (
              <View style={styles.sensitiveWarning} testID="sensitive-warning">
                <AlertTriangle size={18} color={Colors.danger} />
                <View style={styles.sensitiveWarningContent}>
                  <Text style={styles.sensitiveWarningTitle}>Sensitive Data Detected</Text>
                  <Text style={styles.sensitiveWarningText}>
                    {result.sensitiveDataWarning ||
                      'Sensitive information was detected in your screenshot. Please redact it before submitting a ticket.'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={[styles.resultIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Eye size={18} color={Colors.primary} />
                </View>
                <Text style={styles.resultCardTitle}>What I See on Your Screen</Text>
              </View>
              <Text style={styles.resultText}>{result.whatImSeeing}</Text>
            </View>

            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={[styles.resultIcon, { backgroundColor: '#D1FAE5' }]}>
                  <ListChecks size={18} color="#10B981" />
                </View>
                <Text style={styles.resultCardTitle}>Step-by-Step Fix</Text>
              </View>
              {result.stepByStepFix.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={[styles.resultIcon, { backgroundColor: '#FEF3C7' }]}>
                  <LifeBuoy size={18} color="#F59E0B" />
                </View>
                <Text style={styles.resultCardTitle}>If That Didn't Work</Text>
              </View>
              <Text style={styles.resultText}>{result.ifThatDidntWork}</Text>
            </View>

            <View style={[styles.resultCard, styles.summaryCard]}>
              <Text style={styles.summaryTitle}>Ticket Summary</Text>
              <Text style={styles.summaryText}>{result.ticketSummary}</Text>
              <View style={styles.summaryActions}>
                <Pressable
                  style={({ pressed }) => [styles.summaryBtn, copied && styles.summaryBtnCopied, pressed && styles.summaryBtnPressed]}
                  onPress={handleCopy}
                  testID="copy-summary-btn"
                >
                  {copied ? (
                    <Check size={16} color="#10B981" />
                  ) : (
                    <Copy size={16} color={Colors.primary} />
                  )}
                  <Text style={[styles.summaryBtnText, copied && styles.summaryBtnTextCopied]}>
                    {copied ? 'Copied!' : 'Copy Summary'}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.ticketBtn, pressed && styles.ticketBtnPressed]}
                  onPress={handleCreateTicket}
                  testID="create-ticket-btn"
                >
                  <TicketPlus size={16} color="#FFFFFF" />
                  <Text style={styles.ticketBtnText}>Create Ticket</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.resetBtn} onPress={handleReset} testID="reset-btn">
              <RotateCcw size={16} color={Colors.primary} />
              <Text style={styles.resetBtnText}>Start Over</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  headerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
    fontWeight: '500' as const,
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadPlaceholder: {
    backgroundColor: Colors.glassCard,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        } as any
      : {}),
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  uploadBtnAlt: {
    backgroundColor: Colors.primaryLight,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  uploadBtnTextAlt: {
    color: Colors.primary,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  btnPressedAlt: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  previewSection: {
    marginBottom: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
  imageContainer: {
    backgroundColor: Colors.glassCard,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  formSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  required: {
    color: Colors.danger,
  },
  textInput: {
    backgroundColor: Colors.glassCard,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    minHeight: 90,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  analyzeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  analyzeBtnDisabled: {
    opacity: 0.5,
  },
  analyzeBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  analyzeBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: Colors.glassCard,
    borderRadius: 24,
    marginHorizontal: -4,
    overflow: 'hidden',
    position: 'relative' as const,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  glowCornerTL: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
  },
  glowCornerBR: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(97, 52, 147, 0.10)',
  },
  loadingGif: {
    width: 160,
    height: 160,
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
  },
  loadingSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resultSection: {
    gap: 14,
  },
  sensitiveWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  sensitiveWarningContent: {
    flex: 1,
  },
  sensitiveWarningTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 2,
  },
  sensitiveWarningText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 19,
  },
  resultCard: {
    backgroundColor: Colors.glassCard,
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.glassCardBorder,
    shadowColor: Colors.glassCardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  resultText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: 'rgba(237, 229, 245, 0.5)',
    borderColor: 'rgba(95, 47, 153, 0.15)',
    borderWidth: 0.5,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  summaryBtnCopied: {
    backgroundColor: '#D1FAE5',
  },
  summaryBtnPressed: {
    opacity: 0.85,
  },
  summaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  summaryBtnTextCopied: {
    color: '#10B981',
  },
  ticketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  ticketBtnPressed: {
    opacity: 0.85,
  },
  ticketBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  errorBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorBannerText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  retryBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
