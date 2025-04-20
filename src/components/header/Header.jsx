const Header = (props) => {

  const className = props.className ? props.className : "";

  return (
    // <div className={`bg-white/20 rounded-sm backdrop-blur-lg shadow-lg ${className}`}>
    <header className={`bg-white/5 rounded-sm backdrop-blur-lg shadow-lg p-4 ${className}`}>
    </header>
    // </div>
  );
}

export default Header;