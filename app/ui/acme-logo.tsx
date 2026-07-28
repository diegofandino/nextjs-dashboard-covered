import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { lusitana } from './fonts';

export default function AcmeLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center justify-center leading-none`}
    >
      <GlobeAltIcon className="h-24 w-24 rotate-[15deg] text-white" />
    </div>
  );
}
