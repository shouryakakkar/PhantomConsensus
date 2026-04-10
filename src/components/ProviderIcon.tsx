interface IconProps {
  className?: string;
}

export function SlackIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
      <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
      <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
      <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
      <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
    </svg>
  );
}

export function NotionIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>
  );
}

export function JiraIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jira-grad-a" x1="98.03%" x2="58.89%" y1=".96%" y2="40.01%" gradientUnits="userSpaceOnUse">
          <stop offset="18%" stopColor="#0052CC"/>
          <stop offset="100%" stopColor="#2684FF"/>
        </linearGradient>
        <linearGradient id="jira-grad-b" x1="1.97%" x2="40.94%" y1="99.04%" y2="59.05%" gradientUnits="userSpaceOnUse">
          <stop offset="18%" stopColor="#0052CC"/>
          <stop offset="100%" stopColor="#2684FF"/>
        </linearGradient>
      </defs>
      <path fill="url(#jira-grad-a)" d="M11.975 0H5.988C5.988 3.308 8.67 6 11.975 6h2.987v2.994C14.962 12.306 17.644 15 20.95 15V3.012A3.012 3.012 0 0 0 17.938 0z"/>
      <path fill="url(#jira-grad-b)" d="M6.006 9H.019C.019 12.308 2.7 15 6.006 15h2.987v2.994C8.993 21.306 11.675 24 14.981 24V12.012A3.012 3.012 0 0 0 11.969 9z"/>
    </svg>
  );
}

export function TeamsIcon({ className = "w-5 h-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.625 7.125h-5.25v9.75h5.25a1.875 1.875 0 0 0 1.875-1.875V9a1.875 1.875 0 0 0-1.875-1.875z" fill="#5059C9"/>
      <circle cx="17.25" cy="4.875" r="2.25" fill="#5059C9"/>
      <circle cx="10.5" cy="4.125" r="2.625" fill="#7B83EB"/>
      <path d="M14.625 7.875H5.625A1.875 1.875 0 0 0 3.75 9.75v6.375A5.625 5.625 0 0 0 9.375 21.75h2.25a5.625 5.625 0 0 0 5.625-5.625V9.75a1.875 1.875 0 0 0-1.625-1.875z" fill="#7B83EB"/>
      <path opacity=".1" d="M11.25 7.875H5.625A1.875 1.875 0 0 0 3.75 9.75v6.75a5.625 5.625 0 0 0 5.625 5.25h.862a5.625 5.625 0 0 1-4.487-5.25V9.75a1.875 1.875 0 0 1 1.875-1.875H11.25z"/>
      <path d="M11.25 15.75H7.5v-5.25h3.75v5.25z" fill="#fff" opacity=".5"/>
      <path d="M11.25 15.75H9v-5.25h2.25v5.25z" fill="#fff" opacity=".5"/>
      <path d="M7.5 12.75h3.75v1.5H7.5v-1.5z" fill="#fff" opacity=".5"/>
      <path d="M7.5 13.5h3.75v.75H7.5V13.5z" fill="#fff" opacity=".5"/>
    </svg>
  );
}

export function ProviderIcon({ provider, className = "w-5 h-5" }: { provider: string; className?: string }) {
  switch (provider.toLowerCase()) {
    case 'slack': return <SlackIcon className={className} />;
    case 'notion': return <NotionIcon className={className} />;
    case 'jira': return <JiraIcon className={className} />;
    case 'teams':
    case 'microsoft-teams':
    case 'microsoft teams': return <TeamsIcon className={className} />;
    default: return null;
  }
}
