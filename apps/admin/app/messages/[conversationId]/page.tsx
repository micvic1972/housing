import ConversationView from "@/components/message-conversation";

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <ConversationView conversationId={conversationId} />
    </div>
  );
}
