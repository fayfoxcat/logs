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
 * 日志查看器安全配置类 - Spring Security 适配
 * 当 enable-auth=false 且使用 Spring Security 时，配置允许匿名访问日志查看器
 * 使用 SecurityFilterChain 方式（Spring Security 5.7+）
 * 使用最高优先级确保在主项目的 Security 配置之前执行
 *
 * 注意：此配置仅在项目使用 Spring Security 时生效
 * 如果使用其他权限框架，请参考 LogViewerUniversalFilter 的标记
 *
 * @author fayfoxcat
 * @version 0.0.1
 */
@Configuration
@ConditionalOnClass(SecurityFilterChain.class)
@ConditionalOnProperty(prefix = "logs.viewer", name = "enable-auth", havingValue = "false")
@EnableConfigurationProperties(LogViewerProperties.class)
public class LogViewerSecurityConfig {

    private final LogViewerProperties properties;

    public LogViewerSecurityConfig(LogViewerProperties properties) {
        this.properties = properties;
    }

    @Bean
    @Order(1)  // 最高优先级，确保在主项目的 Security 配置之前
    public SecurityFilterChain logViewerSecurityFilterChain(HttpSecurity http) throws Exception {
        String endpoint = properties.getEndpoint();
        http.requestMatchers(matchers -> matchers.antMatchers(endpoint, endpoint + "/**"))
                .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .csrf().disable();
        return http.build();
    }
}
