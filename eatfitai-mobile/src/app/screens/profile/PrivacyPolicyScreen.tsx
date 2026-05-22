// PrivacyPolicyScreen — Legal Hub, Emerald Nebula Design
// Điều khoản & Bảo mật: merged in-app legal content with tabs

import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '../../../components/ThemedText';
import SubScreenLayout from '../../../components/ui/SubScreenLayout';
import { EN, enStyles } from '../../../theme/emeraldNebula';
import type { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

type LegalTab = 'terms' | 'privacy';

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const EFFECTIVE_DATE = '22/05/2026';
const HOME_URL = 'https://eatfitai-download.pages.dev/';
const SUPPORT_EMAIL = 'support@eatfitai.com';

const QUICK_FACTS = [
  'EatFitAI không bán dữ liệu cá nhân cho bên thứ ba.',
  'Tính năng AI và dinh dưỡng chỉ hỗ trợ theo dõi sức khỏe, không thay thế tư vấn y tế.',
  'Camera, thư viện ảnh, micro và thông báo chỉ được dùng cho tính năng bạn chủ động sử dụng hoặc bật.',
  'Bạn có thể yêu cầu hỗ trợ truy cập, chỉnh sửa, xóa hoặc xuất dữ liệu qua email hỗ trợ.',
];

const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. Chấp nhận điều khoản',
    paragraphs: [
      'Khi tạo tài khoản, đăng nhập hoặc tiếp tục sử dụng EatFitAI, bạn đồng ý tuân thủ Điều khoản sử dụng này và các chính sách được hiển thị trong ứng dụng.',
      'Nếu bạn không đồng ý với bất kỳ nội dung nào, vui lòng ngừng sử dụng ứng dụng và liên hệ đội ngũ hỗ trợ nếu cần xử lý dữ liệu hoặc tài khoản.',
    ],
  },
  {
    title: '2. Tài khoản và bảo mật',
    bullets: [
      'Bạn cần cung cấp thông tin chính xác khi đăng ký, xác minh email và cập nhật hồ sơ.',
      'Bạn chịu trách nhiệm giữ an toàn mật khẩu, thiết bị đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình.',
      'Nếu nghi ngờ tài khoản bị truy cập trái phép, hãy đổi mật khẩu và liên hệ EatFitAI càng sớm càng tốt.',
    ],
  },
  {
    title: '3. Tính năng AI và dinh dưỡng',
    paragraphs: [
      'EatFitAI dùng AI để hỗ trợ nhận diện món ăn, ghi chú bữa ăn, gợi ý công thức, phân tích dinh dưỡng và cá nhân hóa mục tiêu. Kết quả AI có thể không chính xác tuyệt đối và cần được bạn kiểm tra trước khi sử dụng.',
      'Thông tin trong ứng dụng chỉ nhằm mục đích hỗ trợ quản lý thói quen ăn uống và sức khỏe cá nhân. EatFitAI không cung cấp chẩn đoán, điều trị, kê đơn hoặc thay thế tư vấn từ bác sĩ, chuyên gia dinh dưỡng hay cơ sở y tế.',
    ],
  },
  {
    title: '4. Nội dung người dùng',
    bullets: [
      'Bạn giữ quyền đối với dữ liệu, ảnh món ăn, ảnh đại diện, món tự tạo và ghi chú do bạn nhập hoặc tải lên.',
      'Bạn cấp cho EatFitAI quyền xử lý nội dung đó trong phạm vi cần thiết để vận hành tính năng, đồng bộ dữ liệu, cải thiện độ ổn định và hỗ trợ bạn.',
      'Bạn không được tải lên nội dung vi phạm pháp luật, xâm phạm quyền riêng tư, quyền sở hữu trí tuệ hoặc quyền hợp pháp của người khác.',
    ],
  },
  {
    title: '5. Quota, gói sử dụng và thay đổi tính năng',
    paragraphs: [
      'Một số tính năng AI có thể có giới hạn lượt dùng theo ngày, theo gói hoặc theo tình trạng hệ thống. Màn quota trong ứng dụng hiển thị thông tin hỗ trợ theo dõi nhưng không làm thay đổi giới hạn thực tế trên backend.',
      'EatFitAI có thể điều chỉnh tính năng, quota, chính sách thử nghiệm, giá hoặc gói sử dụng khi cần thiết. Với thay đổi quan trọng, chúng tôi sẽ cố gắng thông báo trong ứng dụng hoặc qua kênh phù hợp.',
    ],
  },
  {
    title: '6. Hành vi bị cấm',
    bullets: [
      'Lạm dụng API, tự động hóa trái phép, phá hoại hệ thống, vượt quota hoặc can thiệp cơ chế bảo mật.',
      'Sử dụng EatFitAI để tạo, lưu trữ hoặc truyền tải nội dung bất hợp pháp, lừa đảo, gây hại hoặc xâm phạm quyền của người khác.',
      'Sao chép, bán lại, reverse engineering hoặc khai thác mã, mô hình, giao diện, dữ liệu và tài sản thương hiệu khi chưa được phép.',
    ],
  },
  {
    title: '7. Sở hữu trí tuệ',
    paragraphs: [
      'EatFitAI, giao diện, nhãn hiệu, thiết kế, mã nguồn, biểu tượng, nội dung hệ thống và các tài sản liên quan thuộc quyền sở hữu hoặc quyền sử dụng hợp pháp của đội ngũ EatFitAI.',
      'Bạn được cấp quyền sử dụng ứng dụng ở phạm vi cá nhân, không độc quyền, không chuyển nhượng và có thể bị chấm dứt nếu vi phạm điều khoản.',
    ],
  },
  {
    title: '8. Tạm ngưng và chấm dứt',
    paragraphs: [
      'EatFitAI có thể tạm ngưng, giới hạn hoặc chấm dứt quyền truy cập nếu phát hiện hành vi vi phạm điều khoản, rủi ro bảo mật, gian lận hoặc yêu cầu từ cơ quan có thẩm quyền.',
      'Bạn có thể ngừng sử dụng ứng dụng bất cứ lúc nào. Một số dữ liệu có thể tiếp tục được lưu trong thời gian cần thiết cho vận hành, bảo mật, sao lưu, giải quyết tranh chấp hoặc nghĩa vụ pháp lý.',
    ],
  },
  {
    title: '9. Giới hạn trách nhiệm',
    paragraphs: [
      'EatFitAI được cung cấp trên cơ sở nỗ lực hợp lý. Chúng tôi không đảm bảo ứng dụng luôn không lỗi, không gián đoạn hoặc mọi kết quả AI/dinh dưỡng luôn đúng với mọi trường hợp.',
      'Trong phạm vi pháp luật cho phép, EatFitAI không chịu trách nhiệm cho quyết định sức khỏe, chế độ ăn hoặc thiệt hại phát sinh từ việc sử dụng kết quả AI mà không có kiểm tra, xác nhận hoặc tư vấn chuyên môn phù hợp.',
    ],
  },
  {
    title: '10. Liên hệ về điều khoản',
    paragraphs: [
      `Nếu bạn có câu hỏi về Điều khoản sử dụng, vui lòng liên hệ ${SUPPORT_EMAIL}.`,
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Phạm vi và nguyên tắc xử lý',
    paragraphs: [
      'Chính sách này áp dụng cho ứng dụng EatFitAI, tài khoản người dùng, nhật ký bữa ăn, hồ sơ dinh dưỡng, tính năng AI, thông báo, phản hồi hỗ trợ và các dịch vụ liên quan.',
      'EatFitAI xử lý dữ liệu theo nguyên tắc minh bạch, đúng mục đích, giới hạn trong phạm vi cần thiết, bảo mật hợp lý và tôn trọng quyền kiểm soát dữ liệu của người dùng.',
    ],
  },
  {
    title: '2. Dữ liệu chúng tôi thu thập',
    bullets: [
      'Thông tin tài khoản: email, tên hiển thị, mật khẩu đã băm, trạng thái xác minh, thông tin Google nếu bạn chọn đăng nhập bằng Google.',
      'Hồ sơ sức khỏe cá nhân: chiều cao, cân nặng, mục tiêu, lịch sử chỉ số, tùy chọn ăn uống, giới tính hoặc dữ liệu bạn chủ động nhập.',
      'Dữ liệu dinh dưỡng: nhật ký bữa ăn, món ăn tự tạo, tìm kiếm, món thường dùng, lượng nước, mục tiêu calo và macro.',
      'Nội dung tải lên: ảnh món ăn, ảnh đại diện, ghi chú, lệnh giọng nói hoặc dữ liệu bạn gửi để sử dụng tính năng AI.',
      'Dữ liệu kỹ thuật: thiết bị, hệ điều hành, phiên bản app, log lỗi, trạng thái mạng, token thông báo, địa chỉ IP gần đúng và dữ liệu cần thiết để bảo mật/vận hành.',
      'Phản hồi hỗ trợ: loại góp ý, nội dung bạn nhập, email tài khoản, phiên bản app, nền tảng và thiết bị để đội ngũ phản hồi đúng ngữ cảnh.',
    ],
  },
  {
    title: '3. Mục đích sử dụng',
    bullets: [
      'Tạo, xác thực, bảo vệ và quản lý tài khoản.',
      'Cá nhân hóa mục tiêu dinh dưỡng, thống kê, nhắc nhở và trải nghiệm trong app.',
      'Xử lý ảnh, giọng nói, ghi chú và dữ liệu bữa ăn để cung cấp tính năng AI.',
      'Đồng bộ dữ liệu, khôi phục phiên, hỗ trợ người dùng và phản hồi góp ý.',
      'Phân tích lỗi, đo ổn định, cải thiện hiệu năng, ngăn chặn gian lận và lạm dụng.',
      'Tuân thủ yêu cầu pháp lý, yêu cầu từ cơ quan có thẩm quyền và bảo vệ quyền lợi hợp pháp của EatFitAI hoặc người dùng.',
    ],
  },
  {
    title: '4. Quyền truy cập thiết bị',
    paragraphs: [
      'Camera và thư viện ảnh được dùng để chụp hoặc chọn ảnh món ăn khi bạn sử dụng tính năng quét món hoặc cập nhật ảnh đại diện. Nếu từ chối quyền này, các tính năng khác vẫn có thể sử dụng bình thường khi không phụ thuộc vào ảnh.',
      'Micro được dùng cho tính năng ghi âm/nhập bằng giọng nói nếu bạn chủ động sử dụng. Thông báo được dùng để nhắc bữa ăn, cập nhật trải nghiệm và các nội dung bạn cho phép trong app.',
      'Bạn có thể thu hồi quyền camera, ảnh, micro và thông báo trong cài đặt hệ điều hành bất cứ lúc nào.',
    ],
  },
  {
    title: '5. Bên xử lý và chia sẻ dữ liệu',
    paragraphs: [
      'EatFitAI có thể sử dụng nhà cung cấp hạ tầng backend/cloud, lưu trữ tệp, xử lý AI, gửi email, đăng nhập, thông báo, crash reporting hoặc analytics để vận hành ứng dụng.',
      'Các bên này chỉ được xử lý dữ liệu trong phạm vi cần thiết để cung cấp dịch vụ cho EatFitAI hoặc theo yêu cầu pháp luật. Chúng tôi không bán dữ liệu cá nhân cho bên thứ ba để phục vụ quảng cáo độc lập.',
    ],
  },
  {
    title: '6. Lưu trữ, bảo mật và chuyển dữ liệu',
    paragraphs: [
      'Dữ liệu được lưu trong thời gian cần thiết để cung cấp dịch vụ, duy trì bảo mật, sao lưu, xử lý tranh chấp, đáp ứng yêu cầu pháp lý và cải thiện sản phẩm.',
      'Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức hợp lý như truyền tải qua HTTPS, kiểm soát truy cập, xác thực, ghi log bảo mật và giới hạn quyền truy cập nội bộ.',
      'Một số nhà cung cấp dịch vụ có thể đặt hạ tầng ngoài Việt Nam. Khi dữ liệu được xử lý xuyên biên giới, EatFitAI sẽ cố gắng áp dụng biện pháp bảo vệ phù hợp với pháp luật hiện hành.',
    ],
  },
  {
    title: '7. Quyền và lựa chọn của bạn',
    bullets: [
      'Xem và cập nhật nhiều thông tin hồ sơ trực tiếp trong app.',
      'Tắt thông báo hoặc thu hồi quyền thiết bị trong cài đặt.',
      'Yêu cầu truy cập, chỉnh sửa, xóa, hạn chế xử lý, rút lại đồng ý hoặc hỗ trợ xuất dữ liệu bằng cách liên hệ hỗ trợ.',
      'Khi nhận yêu cầu hợp lệ, EatFitAI sẽ xác minh danh tính tài khoản và xử lý trong thời hạn phù hợp với khả năng vận hành và quy định pháp luật áp dụng.',
    ],
  },
  {
    title: '8. Dữ liệu sức khỏe và nội dung nhạy cảm',
    paragraphs: [
      'Dữ liệu cân nặng, mục tiêu, nhật ký ăn uống, ảnh món ăn và phân tích dinh dưỡng có thể phản ánh thói quen sức khỏe cá nhân. EatFitAI xử lý các dữ liệu này để cung cấp trải nghiệm theo dõi và gợi ý trong app.',
      'Bạn nên cân nhắc trước khi nhập nội dung quá nhạy cảm. Nếu bạn có tình trạng y tế đặc biệt, rối loạn ăn uống, bệnh nền hoặc cần chế độ dinh dưỡng chuyên môn, hãy tham khảo chuyên gia phù hợp.',
    ],
  },
  {
    title: '9. Trẻ em',
    paragraphs: [
      'EatFitAI không hướng đến trẻ em dưới 13 tuổi hoặc độ tuổi tối thiểu khác theo pháp luật áp dụng. Nếu phụ huynh hoặc người giám hộ cho rằng trẻ em đã cung cấp dữ liệu cá nhân cho EatFitAI, vui lòng liên hệ để được hỗ trợ xử lý.',
    ],
  },
  {
    title: '10. Thay đổi chính sách',
    paragraphs: [
      'Chúng tôi có thể cập nhật Chính sách bảo mật để phản ánh thay đổi tính năng, nhà cung cấp, quy trình vận hành hoặc yêu cầu pháp luật. Khi thay đổi quan trọng, EatFitAI sẽ cập nhật ngày hiệu lực và có thể thông báo thêm trong app.',
    ],
  },
  {
    title: '11. Liên hệ về quyền riêng tư',
    paragraphs: [
      `Nếu bạn có câu hỏi hoặc yêu cầu liên quan đến dữ liệu cá nhân, vui lòng liên hệ ${SUPPORT_EMAIL}.`,
    ],
  },
];

const TABS: Array<{ key: LegalTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'terms', label: 'Điều khoản', icon: 'document-text-outline' },
  { key: 'privacy', label: 'Bảo mật', icon: 'lock-closed-outline' },
];

const PrivacyPolicyScreen = ({ navigation: _navigation }: Props): React.ReactElement => {
  const [activeTab, setActiveTab] = useState<LegalTab>('terms');

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      console.log('Cannot open URL:', url);
    });
  };

  const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <SubScreenLayout
      title="Điều khoản & Bảo mật"
      subtitle={`Ngày hiệu lực: ${EFFECTIVE_DATE}`}
    >
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={S.heroCard}>
        <View style={S.heroIconWrap}>
          <Ionicons name="shield-checkmark" size={28} color={EN.primary} />
        </View>
        <View style={{ gap: 8 }}>
          <ThemedText style={S.heroTitle}>
            Rõ ràng về quyền sử dụng và dữ liệu cá nhân
          </ThemedText>
          <ThemedText style={S.heroParagraph}>
            Màn này gộp Điều khoản sử dụng và Chính sách bảo mật để bạn xem nhanh
            các quyền, trách nhiệm, cách EatFitAI xử lý dữ liệu và giới hạn của tính
            năng AI/dinh dưỡng.
          </ThemedText>
        </View>

        <View style={S.badgeRow}>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Không bán dữ liệu</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>AI hỗ trợ</ThemedText>
          </View>
          <View style={S.badge}>
            <ThemedText style={S.badgeText}>Người dùng kiểm soát</ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150).duration(400)} style={S.tabBar}>
        {TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                S.tabButton,
                selected && S.tabButtonActive,
                pressed && { opacity: 0.82 },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={selected ? '#07130b' : EN.onSurfaceVariant}
              />
              <ThemedText style={[S.tabText, selected && S.tabTextActive]}>
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(180).duration(400)} style={enStyles.card}>
        <ThemedText style={S.cardTitle}>Tóm tắt nhanh</ThemedText>
        {QUICK_FACTS.map((fact) => (
          <View key={fact} style={S.bulletRow}>
            <View style={S.bulletDot} />
            <ThemedText style={S.bulletText}>{fact}</ThemedText>
          </View>
        ))}
      </Animated.View>

      {sections.map((section, index) => (
        <Animated.View
          key={`${activeTab}-${section.title}`}
          entering={FadeInUp.delay(220 + index * 35).duration(350)}
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

      <Animated.View entering={FadeInUp.delay(700).duration(400)} style={enStyles.card}>
        <ThemedText style={S.cardTitle}>Kênh liên hệ chính thức</ThemedText>
        <Pressable
          onPress={() => handleOpenLink(`mailto:${SUPPORT_EMAIL}`)}
          style={({ pressed }) => [S.contactButton, pressed && { opacity: 0.7 }]}
        >
          <View style={S.contactCopy}>
            <Ionicons name="mail-outline" size={20} color={EN.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText style={S.contactTitle}>{SUPPORT_EMAIL}</ThemedText>
              <ThemedText style={S.contactSubtitle}>
                Hỗ trợ tài khoản, dữ liệu và quyền riêng tư
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={EN.onSurfaceVariant} />
        </Pressable>

        <Pressable
          onPress={() => handleOpenLink(HOME_URL)}
          style={({ pressed }) => [S.contactButton, pressed && { opacity: 0.7 }]}
        >
          <View style={S.contactCopy}>
            <Ionicons name="globe-outline" size={20} color={EN.cyan} />
            <View style={{ flex: 1 }}>
              <ThemedText style={S.contactTitle}>Trang chủ EatFitAI</ThemedText>
              <ThemedText style={S.contactSubtitle}>
                Thông tin, tải app và cập nhật chính thức
              </ThemedText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={EN.onSurfaceVariant} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(760).duration(400)} style={S.footer}>
        <ThemedText style={S.footerText}>
          Nội dung này là bản thông tin sản phẩm để người dùng hiểu cách EatFitAI vận
          hành. Với yêu cầu pháp lý đặc thù, đội ngũ nên rà soát cùng chuyên gia pháp lý.
        </ThemedText>
      </Animated.View>
    </SubScreenLayout>
  );
};

const S = StyleSheet.create({
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
    lineHeight: 24,
    fontFamily: 'BeVietnamPro_700Bold',
    color: EN.onSurface,
  },
  heroParagraph: {
    fontSize: 14,
    color: EN.textMuted,
    lineHeight: 21,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: EN.primaryContainer + '18',
    borderWidth: 1,
    borderColor: EN.primary + '30',
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
    color: EN.primary,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 5,
    backgroundColor: EN.surfaceLow,
    borderWidth: 1,
    borderColor: EN.outline,
    gap: 5,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  tabButtonActive: {
    backgroundColor: EN.primary,
  },
  tabText: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'BeVietnamPro_700Bold',
    color: EN.onSurfaceVariant,
  },
  tabTextActive: {
    color: '#07130b',
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: 'BeVietnamPro_700Bold',
    color: EN.onSurface,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'BeVietnamPro_700Bold',
    color: EN.onSurface,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: EN.textMuted,
    lineHeight: 22,
    marginBottom: 7,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 5,
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
    fontSize: 14,
    color: EN.textMuted,
    lineHeight: 22,
  },
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
    gap: 10,
  },
  contactCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactTitle: {
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: EN.onSurface,
  },
  contactSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: EN.textMuted,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: EN.onSurfaceVariant + '60',
  },
});

export default PrivacyPolicyScreen;
