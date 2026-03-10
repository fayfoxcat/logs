package org.fayfoxcat.log.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * 日志查看器安全配置类 - 启用认证时的配置
 * 当 enable-auth=true 时，禁用 Spring Security 的默认登录表单和 HTTP Basic 认证
 * 使用自定义的密钥认证机制
 *
 * @author fayfoxcat
 * @version 0.0.1
 */
@Configuration
@ConditionalOnClass(SecurityFilterChain.class)
@ConditionalOnProperty(prefix = "logs.viewer", name = "enable-auth", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(LogViewerProperties.class)
public class LogViewerSecurityConfigEnabled {

    private final LogViewerProperties properties;

    public LogViewerSecurityConfigEnabled(LogViewerProperties properties) {
        this.properties = properties;
    }

    @Bean
    @Order(1)  // 最高优先级，确保在主项目的 Security 配置之前执行
    public SecurityFilterChain logViewerSecurityFilterChainEnabled(HttpSecurity http) throws Exception {
        String endpoint = properties.getEndpoint();
        
        http.requestMatchers(matchers -> matchers.antMatchers(endpoint, endpoint + "/**"))
                .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .csrf().disable()
                .formLogin().disable()  // 禁用默认登录表单
                .httpBasic().disable()  // 禁用 HTTP Basic 认证
                .logout().disable();    // 禁用默认登出
        
        return http.build();
    }
}
