export function PortalHeader() {
	return (
		<header className={styles.header}>
			<a href="/" className={styles.brand} aria-label="MakeSB home"><Image src="/assets/makesb-logo-v2.png" width={1688} height={1040} alt="MakeSB" priority /><span>Hacker portal</span></a>
			<span className={styles.event}>JAN 15–17, 2027 <span> / </span> UC SANTA BARBARA</span>
			<a href="https://linktr.ee/ucsbmakesb" className={styles.help}>Need help? ↗</a>
		</header>
	)
}