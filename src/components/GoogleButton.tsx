import { Button } from "react-native";

type Props = {
  onPress: () => void;
};

export default function GoogleButton({ onPress }: Props) {
  return (
    <Button
      title="Continuar com Google"
      onPress={onPress}
    />
  );
}