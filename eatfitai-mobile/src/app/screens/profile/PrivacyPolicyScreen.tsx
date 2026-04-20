// PrivacyPolicyScreen — Emerald Nebula Design
// Chính sách bảo mật: Hero card, Quick Facts, 10 Sections, Contact

import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { EN, enStyles } from '../../../theme/emeraldNebula';
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

/* ═══════════════════════════════════════════════
   PrivacyPolicyScreen — Emerald Nebula
   ═══════════════════════════════════════════════ */
const PrivacyPolicyScreen = ({ navigation: _navigation }: Props): React.ReactElement => {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.log('Cannot open URL:', url);
    });
  };

  return (
    <SubScreenLayout
      title="Chính sách bảo mật"
      subtitle="Ngày hiệu lực: 26/03/2026"
    >
      {/* ─── Hero Card ─── */}
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={S.heroCard}>
        <View style={S.heroIconWrap}>
          <Ionicons name="shield-checkmark" size={28} color={EN.primary} />
        </View>

        <View style={{ gap: 8 }}>
          <ThemedText style={S.heroTitle}>
            Cam kết tôn trọng dữ liệu cá nhân của bạn
          </ThemedText>
          <ThemedText style={S.heroParagraph}>
            EatFitAI thu thập và xử lý dữ liệu cần thiết để cung cấp tính năng theo dõi
            dinh dưỡng, nhận diện món ăn bằng AI và cá nhân hóa trải nghiệm sức khỏe.
            Chúng tôi ưu tiên minh bạch, giảm thiểu thu thập không cần thiết và áp dụng
            biện pháp bảo vệ phù hợp trong suốt vòng đời dữ liệu.
          </ThemedText>
        </View>

        <View style={S.badgeRow}>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Minh bạch</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Không bán dữ liệu</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Kiểm soát bởi người dùng</ThemedText>
          </View>
        </View>
      </Animated.View>

      {/* ─── Quick Facts ─── */}
      <Animated.View entering={FadeInUp.delay(160).duration(400)} style={enStyles.card}>
        <ThemedText style={S.cardTitle}>Tóm tắt nhanh</ThemedText>
        {QUICK_FACTS.map((fact) => (
          <View key={fact} style={S.bulletRow}>
            <View style={S.bulletDot} />
            <ThemedText style={S.bulletText}>{fact}</ThemedText>
          </View>
        ))}
      </Animated.View>

      {/* ─── Policy Sections ─── */}
      {POLICY_SECTIONS.map((section, index) => (
        <Animated.View
          key={section.title}
          entering={FadeInUp.delay(220 + index * 50).duration(400)}
          style={enStyles.card}
        >
          <ThemedText style={S.sectionTitle}>{section.title}</ThemedText>

          {section.paragraphs?.map((paragraph) => (
            <ThemedText key={paragraph} style={S.paragraph}>
              {paragraph}
            </ThemedText>
          ))}

          {section.bullets?.map((bullet) => (
            <View key={bullet} style={S.bulletRow}>
              <View style={S.bulletDot} />
              <ThemedText style={S.bulletText}>{bullet}</ThemedText>
            </View>
          ))}
        </Animated.View>
      ))}

      {/* ─── Contact Section ─── */}
      <Animated.View entering={FadeInUp.delay(800).duration(400)} style={enStyles.card}>
        <ThemedText style={S.cardTitle}>11. Liên hệ</ThemedText>
        <ThemedText style={S.paragraph}>
          Nếu bạn có câu hỏi, yêu cầu hỗ trợ liên quan đến quyền riêng tư hoặc muốn thực
          hiện quyền của mình đối với dữ liệu cá nhân, vui lòng liên hệ EatFitAI qua:
        </ThemedText>

        <Pressable
          onPress={() => handleOpenLink('mailto:support@eatfitai.com')}
          style={({ pressed }) => [S.contactButton, pressed && { opacity: 0.7 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="mail-outline" size={20} color={EN.primary} />
            <View>
              <ThemedText style={{ fontWeight: '600', fontSize: 15, color: EN.onSurface }}>
                support@eatfitai.com
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: EN.textMuted }}>
                Hỗ trợ về tài khoản, dữ liệu và yêu cầu quyền riêng tư
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={EN.onSurfaceVariant} />
        </Pressable>

        <Pressable
          onPress={() => handleOpenLink('https://eatfitai.com')}
          style={({ pressed }) => [S.contactButton, pressed && { opacity: 0.7 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="globe-outline" size={20} color={EN.cyan} />
            <View>
              <ThemedText style={{ fontWeight: '600', fontSize: 15, color: EN.onSurface }}>
                eatfitai.com
              </ThemedText>
              <ThemedText style={{ fontSize: 12, color: EN.textMuted }}>
                Thông tin sản phẩm và cập nhật chính thức
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={EN.onSurfaceVariant} />
        </Pressable>
      </Animated.View>

      {/* ─── Footer ─── */}
      <Animated.View entering={FadeInUp.delay(880).duration(400)} style={S.footer}>
        <ThemedText style={S.footerText}>
          Chính sách này được hiển thị bên trong ứng dụng EatFitAI để bạn có thể xem bất
          cứ lúc nào trong mục Về ứng dụng.
        </ThemedText>
      </Animated.View>
    </SubScreenLayout>
  );
};

/* ─── Styles ─── */
const S = StyleSheet.create({
  /* Hero */
  heroCard: {
    ...enStyles.card,
    gap: 14,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: EN.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: EN.onSurface,
    letterSpacing: -0.3,
  },
  heroParagraph: {
    fontSize: 15,
    color: EN.textMuted,
    lineHeight: 22,
  },

  /* Badges */
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: EN.primaryContainer + '18',
    borderWidth: 1,
    borderColor: EN.primary + '30',
    shadowColor: EN.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: EN.primary,
    letterSpacing: 0.3,
  },

  /* Section */
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: EN.onSurface,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: EN.onSurface,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: EN.textMuted,
    lineHeight: 22,
    marginBottom: 6,
  },

  /* Bullets */
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: EN.primary,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: EN.textMuted,
    lineHeight: 22,
  },

  /* Contact */
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: EN.outline,
    backgroundColor: EN.surfaceHighest,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: EN.onSurfaceVariant + '50',
  },
});

export default PrivacyPolicyScreen;
