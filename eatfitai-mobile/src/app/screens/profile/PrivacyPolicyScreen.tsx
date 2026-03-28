import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '../../../components/ThemedText';
import { glassStyles } from '../../../components/ui/GlassCard';
import { useAppTheme } from '../../../theme/ThemeProvider';
import type { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

type PolicySection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const QUICK_FACTS = [
  'EatFitAI không bán dữ liệu cá nhân cho bên thứ ba.',
  'Ảnh và dữ liệu dinh dưỡng chỉ được sử dụng để cung cấp tính năng của EatFitAI.',
  'Bạn có thể cập nhật hồ sơ, tắt thông báo và thu hồi quyền truy cập trong cài đặt thiết bị.',
];

const POLICY_SECTIONS: PolicySection[] = [
  {
    title: '1. Phạm vi áp dụng',
    paragraphs: [
      'Chính sách này áp dụng cho ứng dụng EatFitAI, các tính năng đăng ký tài khoản, theo dõi dinh dưỡng, nhật ký bữa ăn, quét món ăn bằng AI, tải avatar và thông báo nhắc nhở bữa ăn.',
      'Bằng việc tạo tài khoản hoặc tiếp tục sử dụng ứng dụng, bạn xác nhận đã đọc và đồng ý với cách EatFitAI thu thập, xử lý và bảo vệ dữ liệu theo nội dung dưới đây.',
    ],
  },
  {
    title: '2. Dữ liệu chúng tôi thu thập',
    bullets: [
      'Thông tin tài khoản: họ tên, email, thông tin đăng nhập, thông tin hồ sơ từ Google nếu bạn chọn Đăng nhập với Google.',
      'Thông tin hồ sơ và mục tiêu: tuổi, giới tính, chiều cao, cân nặng, lịch sử cân nặng, mục tiêu sức khỏe, hạn chế ăn uống và tùy chọn dinh dưỡng.',
      'Dữ liệu sử dụng ứng dụng: nhật ký bữa ăn, món ăn tùy chỉnh, lịch sử tìm kiếm, lịch sử quét món ăn, dữ liệu tổng hợp dinh dưỡng và các tùy chọn thông báo.',
      'Hình ảnh và tệp bạn tải lên: ảnh chụp hoặc ảnh thư viện để nhận diện món ăn bằng AI, ảnh đại diện nếu bạn chủ động tải lên.',
      'Dữ liệu kỹ thuật: thông tin thiết bị, hệ điều hành, địa chỉ IP gần đúng, log lỗi, trạng thái mạng, token thông báo và dữ liệu cần thiết để đảm bảo app hoạt động ổn định.',
    ],
  },
  {
    title: '3. Quyền truy cập camera, ảnh và thông báo',
    paragraphs: [
      'EatFitAI chỉ yêu cầu quyền camera và thư viện ảnh khi bạn sử dụng tính năng quét hoặc chọn ảnh món ăn. Nếu bạn không cấp quyền, bạn vẫn có thể sử dụng các tính năng khác không phụ thuộc vào ảnh.',
      'Quyền thông báo được sử dụng để gửi nhắc nhở bữa ăn và cập nhật liên quan đến trải nghiệm trong ứng dụng. Bạn có thể bật, tắt hoặc điều chỉnh quyền này trong cài đặt của thiết bị hoặc trong màn hình cài đặt thông báo của app.',
    ],
  },
  {
    title: '4. Mục đích sử dụng dữ liệu',
    bullets: [
      'Tạo, xác thực và quản lý tài khoản của bạn.',
      'Cá nhân hóa mục tiêu calo, macro, gợi ý dinh dưỡng và trải nghiệm theo dõi sức khỏe.',
      'Phân tích ảnh thực phẩm, lưu lịch sử quét và hỗ trợ bạn xác nhận bữa ăn bằng AI.',
      'Đồng bộ dữ liệu nhật ký, hồ sơ và tiến trình để bạn có thể tiếp tục sử dụng trên thiết bị được hỗ trợ.',
      'Gửi thông báo nhắc nhở, hỗ trợ khách hàng, xử lý phản hồi và cải thiện độ ổn định, hiệu năng, bảo mật của ứng dụng.',
      'Tuân thủ nghĩa vụ pháp lý, ngăn chặn gian lận, lạm dụng hoặc truy cập trái phép.',
    ],
  },
  {
    title: '5. Chia sẻ dữ liệu',
    paragraphs: [
      'Chúng tôi có thể chia sẻ dữ liệu với nhà cung cấp dịch vụ cần thiết để vận hành EatFitAI, ví dụ như hạ tầng máy chủ, xác thực đăng nhập, xử lý hình ảnh, lưu trữ tệp, gửi email hoặc hỗ trợ thông báo. Các bên này chỉ được phép xử lý dữ liệu theo hướng dẫn của EatFitAI và cho mục đích cung cấp dịch vụ.',
      'Chúng tôi có thể tiết lộ dữ liệu nếu được yêu cầu bởi cơ quan nhà nước có thẩm quyền, để bảo vệ quyền lợi hợp pháp của EatFitAI, hoặc trong quá trình tái cấu trúc, sáp nhập hay chuyển giao kinh doanh nếu có.',
      'EatFitAI không bán dữ liệu cá nhân của bạn cho bên thứ ba để phục vụ quảng cáo độc lập.',
    ],
  },
  {
    title: '6. Lưu trữ và bảo mật',
    paragraphs: [
      'Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức hợp lý để bảo vệ dữ liệu cá nhân, bao gồm kiểm soát truy cập, xác thực, giám sát lỗi và giải pháp bảo mật phù hợp với môi trường vận hành.',
      'Dữ liệu được lưu trữ trong thời gian cần thiết để cung cấp dịch vụ, đáp ứng nghĩa vụ pháp lý, giải quyết tranh chấp và thực thi thỏa thuận. Một số bản sao lưu, log hệ thống hoặc dữ liệu đã lưu trữ an toàn có thể được giữ lại thêm một khoảng thời gian hợp lý.',
      'Mặc dù vậy, không có hệ thống nào an toàn tuyệt đối. Bạn nên giữ bí mật thông tin đăng nhập và thông báo ngay cho chúng tôi nếu nghi ngờ tài khoản bị truy cập trái phép.',
    ],
  },
  {
    title: '7. Quyền và lựa chọn của bạn',
    bullets: [
      'Xem và cập nhật một phần thông tin hồ sơ trực tiếp trong ứng dụng.',
      'Tắt nhắc nhở và thông báo trong cài đặt của app hoặc cài đặt hệ điều hành.',
      'Thu hồi quyền camera, ảnh và thông báo trong cài đặt của thiết bị.',
      'Yêu cầu truy cập, chỉnh sửa, xóa hoặc hỗ trợ xuất dữ liệu bằng cách liên hệ support@eatfitai.com.',
      'Ngừng sử dụng app bất cứ lúc nào; tuy nhiên một số dữ liệu có thể tiếp tục được lưu trong thời gian cần thiết cho vận hành, sao lưu, bảo mật và tuân thủ pháp lý.',
    ],
  },
  {
    title: '8. Dữ liệu sức khỏe và nội dung AI',
    paragraphs: [
      'Dữ liệu dinh dưỡng, cân nặng, mục tiêu và kết quả phân tích AI được sử dụng để cá nhân hóa trải nghiệm EatFitAI. Thông tin này chỉ nhằm mục đích hỗ trợ theo dõi sức khỏe cá nhân, không thay thế tư vấn y tế, chẩn đoán hoặc điều trị chuyên môn.',
      'Bạn chịu trách nhiệm xem xét và xác nhận các đề xuất, kết quả nhận diện hoặc thông tin dinh dưỡng trước khi đưa ra quyết định quan trọng liên quan đến sức khỏe.',
    ],
  },
  {
    title: '9. Quyền riêng tư của trẻ em',
    paragraphs: [
      'EatFitAI không hướng đến trẻ em dưới 13 tuổi hoặc độ tuổi tối thiểu khác theo quy định pháp luật áp dụng. Nếu bạn là phụ huynh hoặc người giám hộ và cho rằng trẻ em đã cung cấp dữ liệu cá nhân cho chúng tôi, vui lòng liên hệ để chúng tôi hỗ trợ xử lý phù hợp.',
    ],
  },
  {
    title: '10. Thay đổi chính sách này',
    paragraphs: [
      'Chúng tôi có thể cập nhật Chính sách bảo mật theo thời gian để phản ánh thay đổi về tính năng, quy trình vận hành hoặc yêu cầu pháp lý. Khi có thay đổi quan trọng, chúng tôi sẽ cập nhật ngày hiệu lực trong màn hình này và có thể thông báo thêm trong ứng dụng nếu cần.',
    ],
  },
];

const PrivacyPolicyScreen = ({ navigation }: Props): React.ReactElement => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';
  const glass = glassStyles(isDark);

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.log('Cannot open URL:', url);
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: 60,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtitle: {
      textAlign: 'center',
      marginTop: 8,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    heroCard: {
      ...glass.card,
      gap: theme.spacing.md,
    },
    heroIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.16)' : 'rgba(34, 197, 94, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroIcon: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.success,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    badge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.12)',
    },
    card: {
      ...glass.card,
      gap: theme.spacing.md,
    },
    sectionTitle: {
      marginBottom: theme.spacing.xs,
    },
    paragraph: {
      color: theme.colors.textSecondary,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    bulletDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      marginTop: 8,
      backgroundColor: theme.colors.primary,
    },
    bulletText: {
      flex: 1,
      color: theme.colors.textSecondary,
    },
    contactCard: {
      ...glass.card,
      gap: theme.spacing.sm,
    },
    contactButton: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(59,130,246,0.12)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    footer: {
      alignItems: 'center',
      paddingBottom: theme.spacing.lg,
    },
    footerText: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
  });

  return (
    <LinearGradient
      colors={theme.colors.screenGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ThemedText style={{ fontSize: 18 }}>{'<'}</ThemedText>
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
            <ThemedText variant="h3" weight="700">
              Chính sách bảo mật
            </ThemedText>
          </View>
        </View>

        <ThemedText variant="bodySmall" color="textSecondary" style={styles.subtitle}>
          Ngày hiệu lực: 26/03/2026
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <ThemedText style={styles.heroIcon}>PP</ThemedText>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <ThemedText variant="h3" weight="700">
              Cam kết tôn trọng dữ liệu cá nhân của bạn
            </ThemedText>
            <ThemedText variant="body" style={styles.paragraph}>
              EatFitAI thu thập và xử lý dữ liệu cần thiết để cung cấp tính năng theo dõi
              dinh dưỡng, nhận diện món ăn bằng AI và cá nhân hóa trải nghiệm sức khỏe.
              Chúng tôi ưu tiên minh bạch, giảm thiểu thu thập không cần thiết và áp dụng
              biện pháp bảo vệ phù hợp trong suốt vòng đời dữ liệu.
            </ThemedText>
          </View>

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <ThemedText variant="caption" weight="600" color="primary">
                Minh bạch
              </ThemedText>
            </View>
            <View style={styles.badge}>
              <ThemedText variant="caption" weight="600" color="primary">
                Không bán dữ liệu
              </ThemedText>
            </View>
            <View style={styles.badge}>
              <ThemedText variant="caption" weight="600" color="primary">
                Kiểm soát bởi người dùng
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160)} style={styles.card}>
          <ThemedText variant="h4" weight="700">
            Tóm tắt nhanh
          </ThemedText>
          {QUICK_FACTS.map((fact) => (
            <View key={fact} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <ThemedText variant="body" style={styles.bulletText}>
                {fact}
              </ThemedText>
            </View>
          ))}
        </Animated.View>

        {POLICY_SECTIONS.map((section, index) => (
          <Animated.View
            key={section.title}
            entering={FadeInDown.delay(220 + index * 60)}
            style={styles.card}
          >
            <ThemedText variant="h4" weight="700" style={styles.sectionTitle}>
              {section.title}
            </ThemedText>

            {section.paragraphs?.map((paragraph) => (
              <ThemedText key={paragraph} variant="body" style={styles.paragraph}>
                {paragraph}
              </ThemedText>
            ))}

            {section.bullets?.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <ThemedText variant="body" style={styles.bulletText}>
                  {bullet}
                </ThemedText>
              </View>
            ))}
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(900)} style={styles.contactCard}>
          <ThemedText variant="h4" weight="700">
            11. Liên hệ
          </ThemedText>
          <ThemedText variant="body" style={styles.paragraph}>
            Nếu bạn có câu hỏi, yêu cầu hỗ trợ liên quan đến quyền riêng tư hoặc muốn thực
            hiện quyền của mình đối với dữ liệu cá nhân, vui lòng liên hệ EatFitAI qua:
          </ThemedText>

          <Pressable
            onPress={() => handleOpenLink('mailto:support@eatfitai.com')}
            style={styles.contactButton}
          >
            <ThemedText variant="body" weight="600">
              support@eatfitai.com
            </ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">
              Hỗ trợ về tài khoản, dữ liệu và yêu cầu quyền riêng tư
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleOpenLink('https://eatfitai.com')}
            style={styles.contactButton}
          >
            <ThemedText variant="body" weight="600">
              eatfitai.com
            </ThemedText>
            <ThemedText variant="bodySmall" color="textSecondary">
              Thông tin sản phẩm và cập nhật chính thức
            </ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(980)} style={styles.footer}>
          <ThemedText variant="caption" style={styles.footerText}>
            Chính sách này được hiển thị bên trong ứng dụng EatFitAI để bạn có thể xem bất
            cứ lúc nào trong mục Về ứng dụng.
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

export default PrivacyPolicyScreen;
