import { PaywayPayment } from "@components/PaywayComponent";
import 'dotenv/config';

export default function Home() {
  const payway_public_key = process.env.PAYWAY_PUBLIC_KEY
  const payway_token_url = process.env.PAYWAY_TOKEN_URL
  const userData = {
    ident: '20301402',
    birthdate: '1990-01-01',
  }

  if (!payway_public_key || !payway_token_url) {
    return <div>PayWay configuration is missing</div>
  }

  const paywayData = {
    payway_public_key,
    payway_token_url
  }

  return (
    <div>
      <PaywayPayment userData={userData} paywayData={paywayData} />
    </div>
  );
}
