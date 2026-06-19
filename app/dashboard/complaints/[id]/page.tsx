import ClientPage from './ClientPage';

export async function generateStaticParams() {
  return [{ id: 'dummy' }];
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ClientPage params={params} />;
}
