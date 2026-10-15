import { JewelerProfilePage, jewelerProfileMetadata, type JewelerProfileProps } from "@/components/catalog/jeweler-profile-page";

export const generateMetadata = jewelerProfileMetadata;

export default function Page(props: JewelerProfileProps) {
  return <JewelerProfilePage {...props} details />;
}
