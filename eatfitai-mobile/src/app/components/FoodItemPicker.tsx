import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import Card from '../../components/Card';
import Button from '../../components/Button';
import ThemedTextInput from '../../components/ThemedTextInput';
import { ThemedText } from '../../components/ThemedText';
import { useAppTheme } from '../../theme/ThemeProvider';
import { foodService, type FoodItem } from '../../services/foodService';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: FoodItem) => void;
};

const FoodItemPicker = ({ visible, onClose, onSelect }: Props): JSX.Element => {
  const { theme } = useAppTheme();

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const result = await foodService.searchAllFoods(query.trim(), 20);
      setItems(result.items);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleSelect = useCallback(
    (item: FoodItem) => {
      onSelect(item);
      onClose();
    },
    [onClose, onSelect],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card padding="lg" shadow="md">
          <ThemedText variant="h3" style={{ marginBottom: theme.spacing.sm }}>
            Chon mon an
          </ThemedText>
          <ThemedText variant="bodySmall" color="textSecondary" style={{ marginBottom: theme.spacing.md }}>
            Tim kiem FoodItem de map voi label AI.
          </ThemedText>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <ThemedTextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                placeholder="Nhap ten mon an..."
              />
            </View>
            <Button title="Tim" size="sm" variant="primary" onPress={handleSearch} disabled={isLoading} />
          </View>

          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          )}

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            style={{ maxHeight: 260 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelect(item)}
                style={[styles.row, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body" weight="600">
                    {item.name}
                  </ThemedText>
                  <ThemedText variant="bodySmall" color="textSecondary">
                    {item.calories != null ? `${Math.round(item.calories)} kcal/100g` : '-- kcal'}
                  </ThemedText>
                </View>
                <ThemedText variant="button" color="primary">
                  Chon
                </ThemedText>
              </Pressable>
            )}
          />

          <View style={{ marginTop: theme.spacing.md }}>
            <Button variant="outline" title="Dong" onPress={onClose} />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  loadingRow: { paddingVertical: 8, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

export default FoodItemPicker;

