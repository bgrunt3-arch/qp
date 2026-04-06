type AdBannerProps = {
  size?: "large" | "small";
  className?: string;
};

export function AdBanner({ size = "large", className = "" }: AdBannerProps) {
  if (size === "small") {
    return (
      <div className={`flex flex-col items-center gap-0 ${className}`}>
        <a
          href="https://px.a8.net/svt/ejp?a8mat=4B1EPO+G994FM+50+3T0P5T"
          rel="nofollow"
          target="_blank"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            width={100}
            height={60}
            alt=""
            src="https://www28.a8.net/svt/bgt?aid=260406204983&wid=001&eno=01&mid=s00000000018023014000&mc=1"
          />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={1}
          height={1}
          src="https://www14.a8.net/0.gif?a8mat=4B1EPO+G994FM+50+3T0P5T"
          alt=""
        />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden flex justify-center ${className}`}>
      <div className="flex flex-col items-center gap-0">
        <a
          href="https://px.a8.net/svt/ejp?a8mat=4B1EPO+G994FM+50+3T7CCX"
          rel="nofollow"
          target="_blank"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            width={728}
            height={90}
            alt=""
            src="https://www27.a8.net/svt/bgt?aid=260406204983&wid=001&eno=01&mid=s00000000018023045000&mc=1"
            style={{ maxWidth: "100%" }}
          />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={1}
          height={1}
          src="https://www15.a8.net/0.gif?a8mat=4B1EPO+G994FM+50+3T7CCX"
          alt=""
        />
      </div>
    </div>
  );
}
